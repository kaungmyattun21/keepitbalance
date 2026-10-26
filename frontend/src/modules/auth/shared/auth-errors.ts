type AuthClientError = { code?: string; status?: number; message?: string };

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Email or password is incorrect.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "An account with this email already exists. Try logging in instead.",
  PASSWORD_TOO_SHORT: "Password must be at least 8 characters.",
  PASSWORD_TOO_LONG: "Password must be at most 128 characters.",
  INVALID_TOKEN: "This link has expired or was already used. Request a new one.",
  INVALID_EMAIL: "Enter a valid email address.",
  account_not_linked:
    "You already have an account with this email. Log in with your password, or verify your email first to use Google too.",
  state_mismatch: "Sign-in was interrupted. Please try again.",
  state_not_found: "Sign-in was interrupted. Please try again.",
  invalid_code: "Sign-in was interrupted. Please try again.",
  invalid_callback_request: "Sign-in was interrupted. Please try again.",
  unable_to_link_account: "We couldn't link your Google account. Please try again.",
};

const FALLBACK = "Something went wrong. Please try again.";

export function authErrorMessage(error: AuthClientError): string {
  if (error.status === 429) return "Too many attempts. Wait a few seconds and try again.";
  return (error.code && MESSAGES[error.code]) || FALLBACK;
}

// Errors from browser redirects arrive as ?error=<code>. A cancelled Google sign-in needs no message.
export function redirectErrorMessage(code: string | null): string | null {
  if (!code || code === "access_denied") return null;
  return MESSAGES[code] ?? MESSAGES[code.toUpperCase()] ?? FALLBACK;
}
