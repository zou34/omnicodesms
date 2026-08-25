/**
 * Contract every transactional email integration must implement (Resend,
 * SendGrid, the mock console logger, ...) — same abstract-class pattern as
 * SmsProvider and PaymentProvider, for the same reason: one place to hang
 * shared config, and the caller (the forgot-password route) never needs to
 * know which concrete provider is active.
 */
export abstract class EmailProvider {
  abstract readonly name: string;

  abstract sendPasswordResetEmail(params: { to: string; resetUrl: string }): Promise<void>;

  abstract sendContactMessage(params: {
    to: string;
    from: string;
    name: string;
    message: string;
  }): Promise<void>;
}
