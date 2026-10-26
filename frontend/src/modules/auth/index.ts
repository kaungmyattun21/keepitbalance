export type { Session } from "./shared/auth-client.ts";
export { sessionKeys, useCurrentUser, useSession } from "./shared/session.ts";
export { PUBLIC_PATHS } from "./shared/redirect.ts";
export { AuthLayout } from "./shared/components/AuthLayout.tsx";
export { guestOnly, requireSession } from "./features/guards/middleware.ts";
export { UserMenu } from "./features/account-menu/UserMenu.tsx";
export { VerifyEmailBanner } from "./features/verify-email/VerifyEmailBanner.tsx";

export const loadLoginPage = () => import("./features/login/LoginPage.tsx");
export const loadSignupPage = () => import("./features/signup/SignupPage.tsx");
export const loadForgotPasswordPage = () => import("./features/password-reset/ForgotPasswordPage.tsx");
export const loadResetPasswordPage = () => import("./features/password-reset/ResetPasswordPage.tsx");
export const loadVerifiedPage = () => import("./features/verify-email/VerifiedPage.tsx");
