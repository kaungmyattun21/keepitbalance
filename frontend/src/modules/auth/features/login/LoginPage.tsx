import { zodResolver } from "@hookform/resolvers/zod";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router";
import { z } from "zod";
import { TextField } from "@/shared/components/form/TextField";
import { Button } from "@/shared/components/ui/button";
import { FieldGroup, FieldSeparator } from "@/shared/components/ui/field";
import { ensureQuery } from "@/shared/lib/query-client";
import { authClient } from "../../shared/auth-client.ts";
import { authConfigQuery } from "../../shared/auth-config.ts";
import { authErrorMessage, redirectErrorMessage } from "../../shared/auth-errors.ts";
import { AuthCard } from "../../shared/components/AuthCard.tsx";
import { FormAlert } from "../../shared/components/FormAlert.tsx";
import { GoogleButton } from "../../shared/components/GoogleButton.tsx";
import { safeRedirectPath } from "../../shared/redirect.ts";
import { emailSchema } from "@keepitbalance/shared/schemas";
import { refetchSession } from "../../shared/session.ts";

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

type LoginValues = z.infer<typeof loginSchema>;

export async function loader() {
  await ensureQuery(authConfigQuery);
  return null;
}

export function Component() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: authConfig } = useSuspenseQuery(authConfigQuery);
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"));
  const [formError, setFormError] = useState(() => redirectErrorMessage(searchParams.get("error")));

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    const { error } = await authClient.signIn.email({ ...values, rememberMe: true });
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    await refetchSession();
    await navigate(redirectTo, { replace: true });
  }

  const signupHref = redirectTo === "/" ? "/signup" : `/signup?redirectTo=${encodeURIComponent(redirectTo)}`;

  return (
    <AuthCard
      title="Log in"
      description="Welcome back to KeepItBalance."
      footer={
        <p>
          No account yet?{" "}
          <Link to={signupHref} className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign up
          </Link>
        </p>
      }
    >
      <FormAlert message={formError} />

      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" />
          <TextField
            control={form.control}
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
          />
          <div className="-mt-3 text-right text-sm">
            <Link to="/forgot-password" className="text-muted-foreground underline-offset-4 hover:underline">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Logging in…" : "Log in"}
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
