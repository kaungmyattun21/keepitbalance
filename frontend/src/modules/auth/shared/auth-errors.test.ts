import { describe, expect, it } from "vitest";
import { authErrorMessage, redirectErrorMessage } from "./auth-errors.ts";

describe("authErrorMessage", () => {
  it("maps Better Auth codes to friendly messages", () => {
    expect(authErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD", status: 401 })).toBe(
      "Email or password is incorrect.",
    );
  });

  it("explains rate limiting regardless of code", () => {
    expect(authErrorMessage({ status: 429 })).toMatch(/Too many attempts/);
  });

  it("falls back to a generic message for unknown errors", () => {
    expect(authErrorMessage({ code: "SOMETHING_NEW", status: 500 })).toBe(
      "Something went wrong. Please try again.",
    );
  });
});

describe("redirectErrorMessage", () => {
  it("explains account_not_linked", () => {
    expect(redirectErrorMessage("account_not_linked")).toMatch(/verify your email first/);
  });

  it("stays silent when the user cancelled at Google or there is no error", () => {
    expect(redirectErrorMessage("access_denied")).toBeNull();
    expect(redirectErrorMessage(null)).toBeNull();
  });
});
