import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const registerSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  email: z.string().email("Adresse email invalide."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});

// 5 comptes / 15 min par IP — assez pour un usage légitime (un utilisateur
// ne s'inscrit qu'une fois), assez strict pour freiner le bourrage de comptes.
const REGISTER_LIMIT = 5;
const REGISTER_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const limit = rateLimit(`register:${ip}`, REGISTER_LIMIT, REGISTER_WINDOW_MS);
  if (!limit.success) {
    return rateLimitResponse(limit.retryAfterSeconds);
  }

  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides." },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return NextResponse.json(
      { error: "Un compte existe déjà avec cet email." },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  });

  return NextResponse.json(
    { id: user.id, name: user.name, email: user.email },
    { status: 201 }
  );
}
