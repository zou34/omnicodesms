import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSmsProvider, ProviderError } from "@/lib/providers";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

// Keyed per user (not IP): each purchase debits that user's own balance and
// calls the upstream SMS provider, so the thing worth throttling is one
// account rapid-firing — whether via a bug, a compromised session, or a bot
// script — draining its balance and hammering the provider needlessly.
const ORDER_LIMIT = 10;
const ORDER_WINDOW_MS = 60 * 1000;

const createOrderSchema = z.object({
  country: z
    .string()
    .trim()
    .length(2, "Code pays invalide (ISO 3166-1 alpha-2, ex: US).")
    .transform((value) => value.toUpperCase()),
  service: z
    .string()
    .trim()
    .min(1, "Service requis.")
    .transform((value) => value.toLowerCase()),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const limit = rateLimit(`orders:${session.user.id}`, ORDER_LIMIT, ORDER_WINDOW_MS);
    if (!limit.success) {
      return rateLimitResponse(limit.retryAfterSeconds);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête JSON invalide." }, { status: 400 });
    }

    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Requête invalide." },
        { status: 400 }
      );
    }

    const { country, service } = parsed.data;

    const [countryRecord, serviceRecord] = await Promise.all([
      prisma.country.findUnique({ where: { code: country } }),
      prisma.service.findUnique({ where: { slug: service } }),
    ]);

    if (!countryRecord || !countryRecord.isActive) {
      return NextResponse.json(
        { error: `Pays inconnu ou indisponible: ${country}.` },
        { status: 404 }
      );
    }

    if (!serviceRecord || !serviceRecord.isActive) {
      return NextResponse.json(
        { error: `Service inconnu ou indisponible: ${service}.` },
        { status: 404 }
      );
    }

    const pricing = await prisma.countryService.findUnique({
      where: {
        countryId_serviceId: {
          countryId: countryRecord.id,
          serviceId: serviceRecord.id,
        },
      },
    });

    if (!pricing || !pricing.isActive) {
      return NextResponse.json(
        { error: "Ce service n'est pas disponible pour ce pays." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { balance: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    if (Number(user.balance) < Number(pricing.price)) {
      return NextResponse.json(
        { error: "Solde insuffisant.", code: "INSUFFICIENT_BALANCE" },
        { status: 402 }
      );
    }

    const provider = getSmsProvider();
    let rental;
    try {
      rental = await provider.rentNumber(countryRecord.code, serviceRecord.slug);
    } catch (error) {
      if (error instanceof ProviderError) {
        const status = error.code === "NO_NUMBERS_AVAILABLE" ? 409 : 502;
        return NextResponse.json({ error: error.message, code: error.code }, { status });
      }
      throw error;
    }

    try {
      const order = await prisma.$transaction(async (tx) => {
        // Re-check the balance atomically at write time: it may have moved
        // since the read above (concurrent request). `updateMany` with a
        // `gte` guard lets us detect that in one round-trip instead of a
        // separate read-then-write race.
        const debited = await tx.user.updateMany({
          where: { id: session.user.id, balance: { gte: pricing.price } },
          data: { balance: { decrement: pricing.price } },
        });

        if (debited.count === 0) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        const createdOrder = await tx.order.create({
          data: {
            userId: session.user.id,
            countryId: countryRecord.id,
            serviceId: serviceRecord.id,
            phoneNumber: rental.phoneNumber,
            providerId: rental.providerOrderId,
            price: pricing.price,
            status: "PENDING",
            expiresAt: rental.expiresAt,
          },
        });

        // Signed ledger entry: negative amount for a debit, so a user's
        // full history (deposits + purchases + refunds) nets out to their
        // balance without any separate bookkeeping logic.
        await tx.transaction.create({
          data: {
            userId: session.user.id,
            orderId: createdOrder.id,
            type: "PURCHASE",
            status: "SUCCESS",
            provider: "WALLET",
            providerRef: rental.providerOrderId,
            amount: pricing.price.negated(),
            currency: pricing.currency,
          },
        });

        return createdOrder;
      });

      return NextResponse.json(order, { status: 201 });
    } catch (error) {
      // The number was already rented upstream before this transaction ran.
      // If we can't record/pay for it on our side, release it instead of
      // leaking a paid-for-nothing rental on the provider's books.
      await provider.cancelOrder(rental.providerOrderId).catch(() => {});

      if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json(
          { error: "Solde insuffisant.", code: "INSUFFICIENT_BALANCE" },
          { status: 402 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("[POST /api/orders]", error);
    return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
  }
}
