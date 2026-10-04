import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

// Interrogée en boucle par le dashboard au retour de SasPay, le temps que le
// webhook confirme le paiement (components/dashboard/use-payment-sync.ts) :
// une requête toutes les 3 s au plus, donc 60/min laisse une marge large
// sans permettre de marteler la base.
const STATUS_LIMIT = 60;
const STATUS_WINDOW_MS = 60 * 1000;

// Sans référence explicite, seule une recharge récente est prise en compte :
// une vieille session abandonnée ne doit pas être confondue avec celle dont
// le client revient.
const LATEST_DEPOSIT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Statut d'une recharge du client connecté et son solde à jour.
 *
 * `?ref=` désigne la référence posée par /api/payments/checkout (renvoyée
 * dans l'URL de retour SasPay) ; à défaut, la dernière recharge récente du
 * client. Ne modifie jamais rien : seul le webhook crédite un solde.
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const limit = rateLimit(`payment-status:${session.user.id}`, STATUS_LIMIT, STATUS_WINDOW_MS);
  if (!limit.success) {
    return rateLimitResponse(limit.retryAfterSeconds);
  }

  const reference = new URL(request.url).searchParams.get("ref");

  try {
    const [transaction, user] = await Promise.all([
      prisma.transaction.findFirst({
        // `userId` dans le filtre : une référence d'un autre client est
        // traitée comme introuvable, jamais exposée.
        where: reference
          ? { userId: session.user.id, provider: "GATEWAY", type: "DEPOSIT", providerRef: reference }
          : {
              userId: session.user.id,
              provider: "GATEWAY",
              type: "DEPOSIT",
              createdAt: { gte: new Date(Date.now() - LATEST_DEPOSIT_MAX_AGE_MS) },
            },
        orderBy: { createdAt: "desc" },
        select: { providerRef: true, status: true, amount: true },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { balance: true },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
    }

    return NextResponse.json(
      {
        transaction: transaction
          ? {
              reference: transaction.providerRef,
              status: transaction.status,
              amount: transaction.amount.toString(),
            }
          : null,
        balance: user.balance.toString(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[GET /api/payments/status]", error);
    return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
  }
}
