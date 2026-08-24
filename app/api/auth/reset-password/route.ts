import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const RESET_LIMIT = 10;
const RESET_WINDOW_MS = 15 * 60 * 1000;

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Jeton manquant."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const limit = rateLimit(`reset-password:${ip}`, RESET_LIMIT, RESET_WINDOW_MS);
    if (!limit.success) {
      return rateLimitResponse(limit.retryAfterSeconds);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête JSON invalide." }, { status: 400 });
    }

    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Requête invalide." },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

    const record = await prisma.verificationToken.findUnique({ where: { token } });

    if (!record || record.expires < new Date()) {
      // Clean up an expired-but-still-present token so it can't be reused
      // right up to the last millisecond of a retry.
      if (record) {
        await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
      }
      return NextResponse.json(
        { error: "Ce lien de réinitialisation est invalide ou a expiré." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    try {
      await prisma.$transaction([
        prisma.user.update({
          where: { email: record.identifier },
          data: { password: hashedPassword },
        }),
        // Single-use: the token is gone the moment it's spent, valid or not.
        prisma.verificationToken.delete({ where: { token } }),
      ]);
    } catch {
      // The account was deleted after the reset was requested but before
      // the link was used.
      return NextResponse.json(
        { error: "Ce lien de réinitialisation est invalide ou a expiré." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/auth/reset-password]", error);
    return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
  }
}
