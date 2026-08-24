import { EmailProvider } from "@/lib/email/EmailProvider";

/**
 * Stands in for a real transactional email service (Resend, SendGrid, ...)
 * so the forgot-password flow works end-to-end without one configured yet.
 * Deliberately server-log only — never returns the reset link to the HTTP
 * caller. The whole point of a reset link is that it only reaches the
 * actual inbox; echoing it back in the API response would let anyone
 * reset anyone's password just by calling the endpoint with their email.
 */
export class MockEmailProvider extends EmailProvider {
  readonly name = "mock";

  async sendPasswordResetEmail({ to, resetUrl }: { to: string; resetUrl: string }): Promise<void> {
    console.log(`[MockEmailProvider] Password reset link for ${to}: ${resetUrl}`);
  }
}
