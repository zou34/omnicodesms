import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

// Two layers: a strict per-email limit stops brute-forcing one account, and
// a looser per-IP limit catches the opposite pattern — one bot spraying many
// different emails (credential stuffing) — which the per-email check alone
// wouldn't since each individual email would only be tried once or twice.
const LOGIN_EMAIL_LIMIT = 5;
const LOGIN_EMAIL_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_IP_LIMIT = 20;
const LOGIN_IP_WINDOW_MS = 10 * 60 * 1000;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    // First Google sign-in (account just created by the adapter) lands on the
    // dashboard's welcome modal; NextAuth appends &callbackUrl= itself.
    // Email/password sign-up doesn't go through here — see
    // app/register/register-form.tsx, which redirects to the same URL.
    newUser: "/dashboard?welcome=1",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      // Sans cette option, un compte déjà inscrit par e-mail/mot de passe qui
      // clique ensuite sur "Continuer avec Google" est refusé
      // (OAuthAccountNotLinked) : NextAuth refuse par défaut de rattacher un
      // compte OAuth à un utilisateur existant.
      //
      // "Dangerous" vise les fournisseurs qui ne vérifient pas l'adresse
      // qu'ils transmettent — ce n'est pas le cas de Google, qui n'émet un
      // e-mail qu'à son propriétaire prouvé. Le rattachement donne donc le
      // compte à celui qui possède réellement l'adresse, ce qui est aussi le
      // bon résultat ici : notre inscription par mot de passe ne vérifie pas
      // l'e-mail, donc un compte a pu être créé avec l'adresse d'autrui.
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email et mot de passe requis.");
        }

        const ip = getClientIp(req?.headers);
        const ipLimit = rateLimit(`login:ip:${ip}`, LOGIN_IP_LIMIT, LOGIN_IP_WINDOW_MS);
        const emailLimit = rateLimit(
          `login:email:${credentials.email.toLowerCase()}`,
          LOGIN_EMAIL_LIMIT,
          LOGIN_EMAIL_WINDOW_MS
        );

        if (!ipLimit.success || !emailLimit.success) {
          // Same generic message as invalid credentials below — a bot
          // shouldn't be able to tell "rate limited" from "wrong password".
          throw new Error("Identifiants invalides.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("Identifiants invalides.");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Identifiants invalides.");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};
