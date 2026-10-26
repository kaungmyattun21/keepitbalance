import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { TextField } from "@/shared/components/form/TextField";
import { Button } from "@/shared/components/ui/button";
import { FieldGroup } from "@/shared/components/ui/field";
import { authClient } from "../../shared/auth-client.ts";
import { authErrorMessage } from "../../shared/auth-errors.ts";
import { AuthCard } from "../../shared/components/AuthCard.tsx";
import { FormAlert } from "../../shared/components/FormAlert.tsx";
import { passwordSchema } from "@keepitbalance/shared/schemas";

const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

const requestNewLink = (
  <Link to="/forgot-password" className="font-medium text-foreground underline-offset-4 hover:underline">
    Request a new link
  </Link>
);

export function Component() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  if (!token || searchParams.has("error")) {
    return (
      <AuthCard title="Link expired" footer={requestNewLink}>
        <p className="text-sm text-muted-foreground">
          This password reset link is invalid, has expired, or was already used.
        </p>
      </AuthCard>
    );
  }

  const onSubmit = async ({ password }: ResetPasswordValues) => {
    setFormError(null);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    toast.success("Password updated. Log in with your new password.");
    await navigate("/login", { replace: true });
  };

  return (
    <AuthCard
      title="Choose a new password"
      description="You'll be logged out on all devices."
      footer={requestNewLink}
    >
      <FormAlert message={formError} />
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <TextField
            control={form.control}
            name="password"
            label="New password"
            type="password"
            autoComplete="new-password"
            description="At least 8 characters."
          />
          <TextField
            control={form.control}
            name="confirmPassword"
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
          />
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : "Set new password"}
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
