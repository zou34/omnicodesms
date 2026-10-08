import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const registerSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  // Stocké en minuscules : la connexion, « mot de passe oublié » et le
  // rattachement Google comparent l'adresse — « Awa@Gmail.com » et
  // « awa@gmail.com » doivent désigner le même compte.
  email: z.string().trim().toLowerCase().email("Adresse email invalide."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});

// Par IP, mais large : en Côte d'Ivoire et au Sénégal, les opérateurs mobiles
// partagent une même IP publique entre des milliers d'abonnés (CGNAT). À 5,
// quelques inscriptions simultanées venues d'une publicité suffisaient à
// bloquer les suivantes. Un compte ne donne aucun crédit gratuit : le
// bourrage de comptes n'a rien à gagner, seul le flood est à freiner.
const REGISTER_LIMIT = 30;
const REGISTER_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const limit = rateLimit(`register:${ip}`, REGISTER_LIMIT, REGISTER_WINDOW_MS);
  if (!limit.success) {
    return rateLimitResponse(limit.retryAfterSeconds);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête JSON invalide." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides." },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;

  // Insensible à la casse : des comptes antérieurs ont pu être enregistrés
  // avec des majuscules, avant la normalisation ci-dessus.
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "Un compte existe déjà avec cet email." },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });
  } catch (error) {
    // Double clic sur « Créer mon compte » : la seconde requête perd la course
    // sur la contrainte d'unicité de l'e-mail. Même réponse que ci-dessus.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Un compte existe déjà avec cet email." }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json(
    { id: user.id, name: user.name, email: user.email },
    { status: 201 }
  );
}
