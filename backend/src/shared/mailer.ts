// Sends app emails (verification, password reset). D-019: development only logs them;
// replace the body of sendEmail with a real provider (e.g. Resend) before deploying.
import { config } from "./config.ts";

type Email = {
  to: string;
  subject: string;
  text: string;
};

export async function sendEmail(email: Email): Promise<void> {
  if (config.isProduction) {
    throw new Error("No email provider configured (shared/mailer.ts)");
  }
  console.log(`\n📧 Email to ${email.to}\n   Subject: ${email.subject}\n   ${email.text}\n`);
}

// For callers that must not wait for the email (see modules/auth/auth.ts): logs failures instead of throwing.
export function sendEmailInBackground(email: Email): void {
  sendEmail(email).catch((err) => console.error("Failed to send email:", err));
}
