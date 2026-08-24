import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getEmailProvider } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Per-IP catches a bot sweeping many emails; per-email stops repeatedly
// spamming one inbox with reset links. Same two-layer shape as the login
// rate limits in lib/auth.ts.
const FORGOT_IP_LIMIT = 10;
const FORGOT_IP_WINDOW_MS = 15 * 60 * 1000;
const FORGOT_EMAIL_LIMIT = 3;
const FORGOT_EMAIL_WINDOW_MS = 15 * 60 * 1000;

const forgotPasswordSchema = z.object({
  email: z.string().email("Adresse email invalide."),
});

// Always answers with the same generic message regardless of whether the
// email is registered, has a password (vs. Google-only), or is rate
// limited — the response itself must never be usable to enumerate which
// emails have accounts.
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const ipLimit = rateLimit(`forgot-password:ip:${ip}`, FORGOT_IP_LIMIT, FORGOT_IP_WINDOW_MS);
    if (!ipLimit.success) {
      return rateLimitResponse(ipLimit.retryAfterSeconds);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête JSON invalide." }, { status: 400 });
    }

    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Requête invalide." },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    const genericResponse = NextResponse.json({
      message: "Si un compte existe avec cette adresse, un lien de réinitialisation vient d'être envoyé.",
    });

    const emailLimit = rateLimit(`forgot-password:email:${email}`, FORGOT_EMAIL_LIMIT, FORGOT_EMAIL_WINDOW_MS);
    if (!emailLimit.success) {
      return genericResponse;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { password: true },
    });

    // No account, or a Google-only account with no password to reset —
    // nothing to do, but still answer identically to avoid leaking either
    // fact through response timing/content.
    if (user?.password) {
      // Clear any previous unused tokens for this email first — only the
      // most recently requested link should work.
      await prisma.verificationToken.deleteMany({ where: { identifier: email } });

      const token = randomBytes(32).toString("hex");
      await prisma.verificationToken.create({
        data: { identifier: email, token, expires: new Date(Date.now() + TOKEN_TTL_MS) },
      });

      const resetUrl = `${APP_URL}/reset-password?token=${token}`;
      await getEmailProvider().sendPasswordResetEmail({ to: email, resetUrl });
    }

    return genericResponse;
  } catch (error) {
    console.error("[POST /api/auth/forgot-password]", error);
    return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
  }
}
