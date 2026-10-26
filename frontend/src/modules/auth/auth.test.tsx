// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, type RouteObject } from "react-router";
import { RouterProvider } from "react-router/dom";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { queryClient } from "@/shared/lib/query-client";
import { createFetchMock, json } from "@/shared/test/fetch-mock";
import { sessionFixture } from "@/shared/test/session-fixture";
import {
  AuthLayout,
  guestOnly,
  loadForgotPasswordPage,
  loadLoginPage,
  loadResetPasswordPage,
  loadSignupPage,
  loadVerifiedPage,
  requireSession,
  UserMenu,
  VerifyEmailBanner,
} from "./index.ts";

const routes: RouteObject[] = [
  {
    path: "/",
    middleware: [requireSession],
    children: [
      {
        index: true,
        Component: () => (
          <>
            <h1>Home</h1>
            <VerifyEmailBanner />
            <UserMenu />
          </>
        ),
      },
      { path: "finance", Component: () => <h1>Finance</h1> },
    ],
  },
  {
    Component: AuthLayout,
    children: [
      {
        middleware: [guestOnly],
        children: [
          { path: "login", lazy: loadLoginPage },
          { path: "signup", lazy: loadSignupPage },
          { path: "forgot-password", lazy: loadForgotPasswordPage },
        ],
      },
      { path: "reset-password", lazy: loadResetPasswordPage },
      { path: "verified", lazy: loadVerifiedPage },
    ],
  },
];

const server = createFetchMock();
let session: ReturnType<typeof sessionFixture> | null;

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const currentPath = (router: ReturnType<typeof renderAt>) =>
  router.state.location.pathname + router.state.location.search;

async function fill(label: string, value: string) {
  await userEvent.type(await screen.findByLabelText(label), value);
}

beforeAll(() => {
  // Radix menus rely on browser APIs jsdom doesn't implement.
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
});

beforeEach(() => {
  session = null;
  vi.stubGlobal("fetch", server.fetch);
  server.on("GET /api/v1/auth/get-session", () => json(200, session));
  server.on("GET /api/v1/auth-config", () => json(200, { google: false }));
});

afterEach(() => {
  cleanup();
  queryClient.clear();
  server.reset();
  vi.unstubAllGlobals();
});

describe("guards", () => {
  it("sends logged-out visitors to /login and remembers the page", async () => {
    const router = renderAt("/finance?month=2026-09");

    expect(await screen.findByRole("heading", { name: "Log in" })).toBeTruthy();
    expect(currentPath(router)).toBe("/login?redirectTo=%2Ffinance%3Fmonth%3D2026-09");
  });

  it("sends logged-in users from /login to where they were going", async () => {
    session = sessionFixture();
    const router = renderAt("/login?redirectTo=%2Ffinance");

    expect(await screen.findByRole("heading", { name: "Finance" })).toBeTruthy();
    expect(currentPath(router)).toBe("/finance");
  });
});

describe("login", () => {
  it("validates before sending anything", async () => {
    renderAt("/login");
    const email = await screen.findByLabelText("Email");
    expect(email.hasAttribute("aria-describedby")).toBe(false);

    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Enter a valid email address.")).toBeTruthy();
    expect(screen.getByText("Enter your password.")).toBeTruthy();
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(email.getAttribute("aria-describedby")!)?.textContent).toBe(
      "Enter a valid email address.",
    );
    expect(server.calls("POST /api/v1/auth/sign-in/email")).toHaveLength(0);
  });

  it("shows a friendly message for a wrong password", async () => {
    server.on("POST /api/v1/auth/sign-in/email", () =>
      json(401, { code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" }),
    );
    renderAt("/login");

    await fill("Email", "kaung@example.com");
    await fill("Password", "wrong-password");
    await userEvent.click(await screen.findByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Email or password is incorrect.")).toBeTruthy();
  });

  it("logs in and continues to the remembered page", async () => {
    server.on("POST /api/v1/auth/sign-in/email", () => {
      session = sessionFixture();
      return json(200, { redirect: false, token: "token-1", user: session.user });
    });
    const router = renderAt("/finance?month=2026-09");

    await fill("Email", "kaung@example.com");
    await fill("Password", "correct-horse-1");
    await userEvent.click(await screen.findByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("heading", { name: "Finance" })).toBeTruthy();
    expect(currentPath(router)).toBe("/finance?month=2026-09");
    const [request] = server.calls("POST /api/v1/auth/sign-in/email");
    expect(await request!.json()).toEqual({
      email: "kaung@example.com",
      password: "correct-horse-1",
      rememberMe: true,
    });
  });

  it("ignores redirect targets outside the app", async () => {
    server.on("POST /api/v1/auth/sign-in/email", () => {
      session = sessionFixture();
      return json(200, { redirect: false, token: "token-1", user: session.user });
    });
    const router = renderAt("/login?redirectTo=https%3A%2F%2Fevil.example");

    await fill("Email", "kaung@example.com");
    await fill("Password", "correct-horse-1");
    await userEvent.click(await screen.findByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("heading", { name: "Home" })).toBeTruthy();
    expect(currentPath(router)).toBe("/");
  });

  it("explains errors that come back from Google sign-in", async () => {
    renderAt("/login?error=account_not_linked");

    expect(await screen.findByText(/verify your email first to use Google too/)).toBeTruthy();
  });

  it("offers Google only when the server has it configured", async () => {
    renderAt("/login");
    await screen.findByRole("heading", { name: "Log in" });
    expect(screen.queryByRole("button", { name: "Continue with Google" })).toBeNull();

    cleanup();
    queryClient.clear();
    server.on("GET /api/v1/auth-config", () => json(200, { google: true }));
    renderAt("/login");
    expect(await screen.findByRole("button", { name: "Continue with Google" })).toBeTruthy();
  });
});

describe("signup", () => {
  it("creates the account with the browser's timezone and a verification link back to the app", async () => {
    server.on("POST /api/v1/auth/sign-up/email", () => {
      session = sessionFixture({ emailVerified: false });
      return json(200, { token: "token-1", user: session.user });
    });
    renderAt("/signup");

    await fill("Name", "Kaung");
    await fill("Email", "kaung@example.com");
    await fill("Password", "correct-horse-1");
    await userEvent.click(await screen.findByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("heading", { name: "Home" })).toBeTruthy();
    const [request] = server.calls("POST /api/v1/auth/sign-up/email");
    expect(await request!.json()).toMatchObject({
      name: "Kaung",
      email: "kaung@example.com",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      callbackURL: "http://localhost:3000/verified",
    });
  });

  it("explains a duplicate email", async () => {
    server.on("POST /api/v1/auth/sign-up/email", () =>
      json(422, { code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL", message: "User already exists" }),
    );
    renderAt("/signup");

    await fill("Name", "Kaung");
    await fill("Email", "kaung@example.com");
    await fill("Password", "correct-horse-1");
    await userEvent.click(await screen.findByRole("button", { name: "Create account" }));

    expect(await screen.findByText(/An account with this email already exists/)).toBeTruthy();
  });
});

describe("password reset", () => {
  it("confirms the request without revealing whether the email exists", async () => {
    server.on("POST /api/v1/auth/request-password-reset", () =>
      json(200, { status: true, message: "If this email exists..." }),
    );
    renderAt("/forgot-password");

    await fill("Email", "kaung@example.com");
    await userEvent.click(await screen.findByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeTruthy();
    const [request] = server.calls("POST /api/v1/auth/request-password-reset");
    expect(await request!.json()).toEqual({
      email: "kaung@example.com",
      redirectTo: "http://localhost:3000/reset-password",
    });
  });

  it("shows an expired link when there is no valid token", async () => {
    renderAt("/reset-password?error=INVALID_TOKEN");

    expect(await screen.findByRole("heading", { name: "Link expired" })).toBeTruthy();
  });

  it("checks the confirmation, then sets the new password and goes to login", async () => {
    server.on("POST /api/v1/auth/reset-password", () => json(200, { status: true }));
    const router = renderAt("/reset-password?token=abc123");

    await fill("New password", "new-horse-battery-2");
    await fill("Confirm new password", "something-else");
    await userEvent.click(await screen.findByRole("button", { name: "Set new password" }));
    expect(await screen.findByText("Passwords don't match.")).toBeTruthy();

    await userEvent.clear(screen.getByLabelText("Confirm new password"));
    await fill("Confirm new password", "new-horse-battery-2");
    await userEvent.click(screen.getByRole("button", { name: "Set new password" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    const [request] = server.calls("POST /api/v1/auth/reset-password");
    expect(await request!.json()).toEqual({ newPassword: "new-horse-battery-2", token: "abc123" });
  });
});

describe("email verification", () => {
  it("confirms a verified email and offers to continue", async () => {
    session = sessionFixture();
    renderAt("/verified");

    expect(await screen.findByRole("heading", { name: "Email verified" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Continue to KeepItBalance" }).getAttribute("href")).toBe("/");
  });

  it("explains an expired verification link", async () => {
    renderAt("/verified?error=TOKEN_EXPIRED");

    expect(await screen.findByRole("heading", { name: "Link expired" })).toBeTruthy();
  });

  it("reminds unverified users and resends the email", async () => {
    session = sessionFixture({ emailVerified: false });
    server.on("POST /api/v1/auth/send-verification-email", () => json(200, { status: true }));
    renderAt("/");

    expect(await screen.findByText(/We sent a link to kaung@example.com/)).toBeTruthy();
    expect(screen.queryByText(/Google/)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Resend email" }));

    expect(await screen.findByRole("button", { name: "Email sent" })).toBeTruthy();
    const [request] = server.calls("POST /api/v1/auth/send-verification-email");
    expect(await request!.json()).toEqual({
      email: "kaung@example.com",
      callbackURL: "http://localhost:3000/verified",
    });
  });

  it("shows no reminder once the email is verified", async () => {
    session = sessionFixture();
    renderAt("/");

    await screen.findByRole("heading", { name: "Home" });
    expect(screen.queryByText("Verify your email")).toBeNull();
  });
});

describe("sign out", () => {
  it("ends the session, goes to login and forgets cached data", async () => {
    session = sessionFixture();
    server.on("POST /api/v1/auth/sign-out", () => {
      session = null;
      return json(200, { success: true });
    });
    const router = renderAt("/");
    await screen.findByRole("heading", { name: "Home" });
    queryClient.setQueryData(["finance", "transactions"], ["private data"]);

    await userEvent.click(screen.getByRole("button", { name: "Account menu for Kaung" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Sign out" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(queryClient.getQueryData(["finance", "transactions"])).toBeUndefined();
  });
});
