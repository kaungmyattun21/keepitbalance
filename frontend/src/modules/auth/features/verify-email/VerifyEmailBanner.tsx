import { MailWarning } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { authClient } from "../../shared/auth-client.ts";
import { authErrorMessage } from "../../shared/auth-errors.ts";
import { absoluteUrl } from "../../shared/redirect.ts";
import { useSession } from "../../shared/session.ts";

export function VerifyEmailBanner() {
  const session = useSession();
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  if (!session || session.user.emailVerified) return null;
  const { email } = session.user;

  async function resend() {
    setStatus("sending");
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: absoluteUrl("/verified"),
    });
    if (error) {
      setStatus("idle");
      toast.error(authErrorMessage(error));
      return;
    }
    setStatus("sent");
    toast.success(`Verification email sent to ${email}.`);
  }

  return (
    <Alert role="status" className="mb-8">
      <MailWarning aria-hidden />
      <AlertTitle>Verify your email</AlertTitle>
      <AlertDescription>
        We sent a link to {email}. Open it to confirm this address belongs to you.
      </AlertDescription>
      <AlertAction>
        <Button size="sm" variant="outline" disabled={status !== "idle"} onClick={() => void resend()}>
          {status === "sent" ? "Email sent" : status === "sending" ? "Sending…" : "Resend email"}
        </Button>
      </AlertAction>
    </Alert>
  );
}
