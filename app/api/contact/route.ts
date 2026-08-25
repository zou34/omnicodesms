import { NextResponse } from "next/server";
import { z } from "zod";

import { getEmailProvider } from "@/lib/email";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const CONTACT_LIMIT = 5;
const CONTACT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const contactSchema = z.object({
  name: z.string().trim().min(1, "Nom requis.").max(200),
  email: z.string().email("Adresse email invalide."),
  message: z.string().trim().min(1, "Message requis.").max(5000),
});

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

    // No ContactMessage table yet — a clean, structured server-side log is
    // the documented baseline (see docs/AUDIT.md); still notify a real
    // inbox via the same EmailProvider used for password resets when
    // CONTACT_EMAIL is configured, best-effort so a delivery hiccup never
    // fails the user's submission.
    console.log(`[Contact] ${name} <${email}>: ${message}`);

    const contactEmail = process.env.CONTACT_EMAIL;
    if (contactEmail) {
      await getEmailProvider()
        .sendContactMessage({ to: contactEmail, name, from: email, message })
        .catch((error) => {
          console.error("[POST /api/contact] notification email failed", error);
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/contact]", error);
    return NextResponse.json({ error: "Une erreur interne est survenue." }, { status: 500 });
  }
}
