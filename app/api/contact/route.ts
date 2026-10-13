import { NextResponse } from "next/server";
import { z } from "zod";

import { getEmailProvider } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const CONTACT_LIMIT = 5;
const CONTACT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const contactSchema = z.object({
  name: z.string().trim().min(1, "Nom requis.").max(200),
  email: z.string().trim().email("Adresse email invalide.").max(320),
  message: z.string().trim().min(1, "Message requis.").max(5000),
});

const recipientSchema = z.string().email();

/**
 * Destinataires de la notification, depuis CONTACT_EMAIL. Tolère les erreurs
 * de saisie courantes dans le tableau de bord Vercel — guillemets autour de la
 * valeur, espaces, retour à la ligne — qui faisaient refuser l'envoi par
 * Resend sans que personne ne le voie. Plusieurs adresses : séparées par des
 * virgules.
 */
function parseContactRecipients(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((value) => value.trim().replace(/^["']+|["']+$/g, "").trim())
    .filter((value) => recipientSchema.safeParse(value).success);
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const limit = rateLimit(`contact:${ip}`, CONTACT_LIMIT, CONTACT_WINDOW_MS);
    if (!limit.success) {
      return rateLimitResponse(limit.retryAfterSeconds);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête JSON invalide." }, { status: 400 });
    }

    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Requête invalide." },
        { status: 400 }
      );
    }

    const { name, email, message } = parsed.data;

    // La base est la source de vérité : si l'écriture échoue, le visiteur
    // reçoit une erreur (catch ci-dessous) plutôt qu'un faux "message envoyé".
    await prisma.contactMessage.create({ data: { name, email, message } });

    // Notification e-mail en plus : le message est déjà enregistré (lisible
    // dans /admin/messages), un souci de livraison ne doit donc pas faire
    // échouer l'envoi côté visiteur. Mais il ne doit plus passer inaperçu :
    // chaque cause d'échec est journalisée explicitement.
    const recipients = parseContactRecipients(process.env.CONTACT_EMAIL);
    if (recipients.length === 0) {
      console.error(
        "[POST /api/contact] CONTACT_EMAIL absente ou invalide : message enregistré en base, " +
          "aucune notification envoyée. Valeur attendue : une adresse e-mail (ou plusieurs, séparées par des virgules)."
      );
    } else {
      try {
        await getEmailProvider().sendContactMessage({ to: recipients, name, from: email, message });
      } catch (error) {
        console.error(
          `[POST /api/contact] notification vers ${recipients.join(", ")} refusée :`,
          error instanceof Error ? error.message : error
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/contact]", error);
    return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
  }
}
