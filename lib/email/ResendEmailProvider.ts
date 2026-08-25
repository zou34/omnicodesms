import { Resend } from "resend";

import { EmailProvider } from "@/lib/email/EmailProvider";

// Resend's own sandbox sender — works without a verified domain, but
// Resend restricts its recipients (typically to the account owner's own
// address) until a real domain is verified. Override with EMAIL_FROM once
// a domain is set up in the Resend dashboard.
const DEFAULT_FROM = "OmniCodeSMS <onboarding@resend.dev>";

export class ResendEmailProvider extends EmailProvider {
  readonly name = "resend";

  private client: Resend;

  constructor() {
    super();
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY est requis pour utiliser ResendEmailProvider.");
    }
    this.client = new Resend(apiKey);
  }

  async sendPasswordResetEmail({ to, resetUrl }: { to: string; resetUrl: string }): Promise<void> {
    const from = process.env.EMAIL_FROM || DEFAULT_FROM;

    const { error } = await this.client.emails.send({
      from,
      to,
      subject: "Réinitialisez votre mot de passe OmniCodeSMS",
      html: renderPasswordResetHtml(resetUrl),
      text: `Réinitialisez votre mot de passe OmniCodeSMS en ouvrant ce lien (valable 1 heure) : ${resetUrl}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
    });

    if (error) {
      console.error("[ResendEmailProvider] send failed", error);
      throw new Error("Échec de l'envoi de l'e-mail de réinitialisation.");
    }
  }

  async sendContactMessage({
    to,
    from,
    name,
    message,
  }: {
    to: string;
    from: string;
    name: string;
    message: string;
  }): Promise<void> {
    const senderAddress = process.env.EMAIL_FROM || DEFAULT_FROM;

    const { error } = await this.client.emails.send({
      from: senderAddress,
      to,
      replyTo: from,
      subject: `Nouveau message de contact — ${name}`,
      html: renderContactMessageHtml({ name, from, message }),
      text: `Nouveau message de contact\n\nDe : ${name} <${from}>\n\n${message}`,
    });

    if (error) {
      console.error("[ResendEmailProvider] contact notification failed", error);
      throw new Error("Échec de l'envoi de la notification de contact.");
    }
  }
}

function renderPasswordResetHtml(resetUrl: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #0f172a; padding: 32px 16px;">
      <div style="max-width: 480px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155;">
        <p style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0 0 24px;">OmniCodeSMS</p>
        <h1 style="color: #ffffff; font-size: 18px; margin: 0 0 12px;">Réinitialisez votre mot de passe</h1>
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
          Vous avez demandé la réinitialisation de votre mot de passe. Ce lien est valable 1 heure et ne peut être utilisé qu'une seule fois.
        </p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 8px;">
          Réinitialiser mon mot de passe
        </a>
        <p style="color: #64748b; font-size: 12px; line-height: 1.6; margin: 24px 0 0;">
          Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité — votre mot de passe ne changera pas.
        </p>
      </div>
    </div>
  `;
}

function renderContactMessageHtml({
  name,
  from,
  message,
}: {
  name: string;
  from: string;
  message: string;
}): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #0f172a; padding: 32px 16px;">
      <div style="max-width: 480px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155;">
        <p style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0 0 24px;">OmniCodeSMS</p>
        <h1 style="color: #ffffff; font-size: 18px; margin: 0 0 12px;">Nouveau message de contact</h1>
        <p style="color: #94a3b8; font-size: 14px; margin: 0 0 16px;">
          De <strong style="color: #ffffff;">${escapeHtml(name)}</strong> — ${escapeHtml(from)}
        </p>
        <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6; white-space: pre-wrap; background-color: #0f172a; border-radius: 8px; padding: 16px; margin: 0;">${escapeHtml(message)}</p>
      </div>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
