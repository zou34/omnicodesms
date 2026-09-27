import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { PROMO_CODE_MAX_LENGTH, validatePromoCode } from "@/lib/promo";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

// Strict : sans limite, un script pourrait essayer des milliers de codes
// jusqu'à en trouver un valide.
const PROMO_LIMIT = 10;
const PROMO_WINDOW_MS = 10 * 60 * 1000;

const schema = z.object({
  code: z.string().trim().min(1, "Saisissez un code promo.").max(PROMO_CODE_MAX_LENGTH, "Code promo invalide."),
});

// Aperçu du bonus avant paiement. N'engage rien : le code est revérifié au
// checkout, puis de façon atomique à la confirmation du paiement.
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const limit = rateLimit(`promo:${session.user.id}`, PROMO_LIMIT, PROMO_WINDOW_MS);
    if (!limit.success) {
      return rateLimitResponse(limit.retryAfterSeconds);
    }

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });
    }

    const result = await validatePromoCode(parsed.data.code, session.user.id, null);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    // Règles du code, pour afficher le bonus sur chaque palier. Rien de
    // secret : ce sont les conditions que le client va de toute façon voir.
    const { code, type, value, maxBonusFcfa, minRechargeFcfa } = result.promo;
    return NextResponse.json({ code, type, value, maxBonusFcfa, minRechargeFcfa, label: result.label });
  } catch (error) {
    console.error("[POST /api/promo/validate]", error);
    return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
  }
}
