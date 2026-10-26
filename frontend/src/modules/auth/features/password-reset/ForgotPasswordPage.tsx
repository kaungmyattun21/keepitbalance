import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod";
import { TextField } from "@/shared/components/form/TextField";
import { Button } from "@/shared/components/ui/button";
import { FieldGroup } from "@/shared/components/ui/field";
import { authClient } from "../../shared/auth-client.ts";
import { authErrorMessage } from "../../shared/auth-errors.ts";
import { AuthCard } from "../../shared/components/AuthCard.tsx";
import { FormAlert } from "../../shared/components/FormAlert.tsx";
import { absoluteUrl } from "../../shared/redirect.ts";
import { emailSchema } from "@keepitbalance/shared/schemas";

const forgotPasswordSchema = z.object({ email: emailSchema });

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

const backToLogin = (
  <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
    Back to log in
  </Link>
);

export function Component() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit({ email }: ForgotPasswordValues) {
    setFormError(null);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: absoluteUrl("/reset-password"),
    });
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <AuthCard title="Check your email" footer={backToLogin}>
        <div className="flex flex-col items-center gap-3 text-center">
          <MailCheck className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            If an account exists for <span className="font-medium text-foreground">{sentTo}</span>, we sent a
            link to reset your password. It's valid for 1 hour.
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot your password?"
      description="Enter your email and we'll send you a link to choose a new one."
      footer={backToLogin}
    >
      <FormAlert message={formError} />
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" />
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Sending…" : "Send reset link"}
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
