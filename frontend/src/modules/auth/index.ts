export type { Session } from "./shared/auth-client.ts";
export { cachedUserTimezone, sessionKeys, useCurrentUser, useSession } from "./shared/session.ts";
export { PUBLIC_PATHS } from "./shared/redirect.ts";
export { AuthLayout } from "./shared/components/AuthLayout.tsx";
export { guestOnly, requireSession } from "./features/guards/middleware.ts";
export { UserMenu } from "./features/account-menu/UserMenu.tsx";
export { VerifyEmailBanner } from "./features/verify-email/VerifyEmailBanner.tsx";

export async function lazyLoginPage() {
  const [{ LoginPage }, { loginPageLoader }] = await Promise.all([
    import("./features/login/LoginPage.tsx"),
    import("./features/login/login-page-loader.ts"),
  ]);
  return { Component: LoginPage, loader: loginPageLoader };
}

export async function lazySignupPage() {
  const [{ SignupPage }, { signupPageLoader }] = await Promise.all([
    import("./features/signup/SignupPage.tsx"),
    import("./features/signup/signup-page-loader.ts"),
  ]);
  return { Component: SignupPage, loader: signupPageLoader };
}

export async function lazyForgotPasswordPage() {
  const { ForgotPasswordPage } = await import("./features/password-reset/ForgotPasswordPage.tsx");
  return { Component: ForgotPasswordPage };
}

export async function lazyResetPasswordPage() {
  const { ResetPasswordPage } = await import("./features/password-reset/ResetPasswordPage.tsx");
  return { Component: ResetPasswordPage };
}

export async function lazyVerifiedPage() {
  const [{ VerifiedPage }, { verifiedPageLoader }] = await Promise.all([
    import("./features/verify-email/VerifiedPage.tsx"),
    import("./features/verify-email/verified-page-loader.ts"),
  ]);
  return { Component: VerifiedPage, loader: verifiedPageLoader };
}
