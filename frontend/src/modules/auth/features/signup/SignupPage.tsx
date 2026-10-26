import { zodResolver } from "@hookform/resolvers/zod";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { TextField } from "@/shared/components/form/TextField";
import { Button } from "@/shared/components/ui/button";
import { FieldGroup, FieldSeparator } from "@/shared/components/ui/field";
import { ensureQuery } from "@/shared/lib/query-client";
import { authClient } from "../../shared/auth-client.ts";
import { authConfigQuery } from "../../shared/auth-config.ts";
import { authErrorMessage } from "../../shared/auth-errors.ts";
import { AuthCard } from "../../shared/components/AuthCard.tsx";
import { FormAlert } from "../../shared/components/FormAlert.tsx";
import { GoogleButton } from "../../shared/components/GoogleButton.tsx";
import { absoluteUrl, safeRedirectPath } from "../../shared/redirect.ts";
import { emailSchema, passwordSchema } from "@keepitbalance/shared/schemas";
import { refetchSession } from "../../shared/session.ts";

const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100, "Name must be at most 100 characters."),
  email: emailSchema,
  password: passwordSchema,
});

type SignupValues = z.infer<typeof signupSchema>;

export async function loader() {
  await ensureQuery(authConfigQuery);
  return null;
}

export function Component() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: authConfig } = useSuspenseQuery(authConfigQuery);
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"));
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: SignupValues) {
    setFormError(null);
    const { error } = await authClient.signUp.email({
      ...values,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      callbackURL: absoluteUrl("/verified"),
    });
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    await refetchSession();
    toast.success("Account created. We sent you an email to verify your address.");
    await navigate(redirectTo, { replace: true });
  }

  return (
    <AuthCard
      title="Create your account"
      description="Track money, meals and water in one place."
      footer={
        <p>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      }
    >
      <FormAlert message={formError} />

      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <TextField control={form.control} name="name" label="Name" autoComplete="name" />
          <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" />
          <TextField
            control={form.control}
            name="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            description="At least 8 characters."
          />
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Creating account…" : "Create account"}
          </Button>
        </FieldGroup>
      </form>

      {authConfig.google && (
        <>
          <FieldSeparator>or</FieldSeparator>
          <GoogleButton redirectTo={redirectTo} onError={setFormError} />
        </>
      )}
    </AuthCard>
  );
}
