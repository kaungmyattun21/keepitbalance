// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, setUnauthorizedHandler } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/query-client";
import { createFetchMock, json } from "@/shared/test/fetch-mock";
import { sessionFixture } from "@/shared/test/session-fixture";
import { routes } from "./routes.ts";
import { redirectToLoginOnSessionExpiry } from "./session-expiry.ts";

const server = createFetchMock();
let session: ReturnType<typeof sessionFixture> | null;

function renderAt(path: string) {
  const memoryRouter = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={memoryRouter} />
    </QueryClientProvider>,
  );
  return memoryRouter;
}

beforeEach(() => {
  session = sessionFixture();
  vi.stubGlobal("fetch", server.fetch);
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  server.on("GET /api/v1/auth/get-session", () => json(200, session));
  server.on("GET /api/v1/auth-config", () => json(200, { google: false }));
  server.on("GET /api/v1/health", () => json(200, { status: "ok" }));
});

afterEach(() => {
  cleanup();
  queryClient.clear();
  server.reset();
  vi.unstubAllGlobals();
  localStorage.clear();
  setUnauthorizedHandler(undefined);
});

describe("app shell", () => {
  it("loads the dashboard's data before rendering it", async () => {
    renderAt("/");

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeTruthy();
    expect(screen.getByText(/Welcome back, Kaung/)).toBeTruthy();
    expect(screen.getByTestId("api-status").textContent).toBe("ok");
  });

  it("shows modules that aren't built yet as disabled, not as links", async () => {
    renderAt("/");
    await screen.findByRole("heading", { name: "Dashboard" });

    expect(screen.getAllByRole("link", { name: "Dashboard" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Finance" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /Meals/ })).toBeNull();
  });

  it("names each page in the document title and lets keyboard users skip to the content", async () => {
    renderAt("/");
    await screen.findByRole("heading", { name: "Dashboard" });

    await waitFor(() => expect(document.title).toBe("Dashboard · KeepItBalance"));
    const skipLink = screen.getByRole("link", { name: "Skip to content" });
    expect(document.querySelector(skipLink.getAttribute("href")!)?.tagName).toBe("MAIN");
  });

  it("renders unknown routes as 'not found' inside the shell", async () => {
    renderAt("/does-not-exist");

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeTruthy();
    expect(screen.getAllByRole("navigation", { name: "Main" }).length).toBeGreaterThan(0);
  });

  it("retries a temporary server error automatically", async () => {
    let calls = 0;
    server.on("GET /api/v1/health", () => {
      calls += 1;
      return calls === 1
        ? json(500, { error: { code: "INTERNAL_ERROR", message: "Oops" } })
        : json(200, { status: "ok" });
    });

    renderAt("/");

    expect(await screen.findByRole("heading", { name: "Dashboard" }, { timeout: 3000 })).toBeTruthy();
    expect(calls).toBe(2);
  });

  it("shows an error with a working retry when a loader fails for good", async () => {
    let calls = 0;
    server.on("GET /api/v1/health", () => {
      calls += 1;
      return calls === 1
        ? json(404, { error: { code: "NOT_FOUND", message: "Gone for now" } })
        : json(200, { status: "ok" });
    });

    renderAt("/");

    expect(await screen.findByRole("heading", { name: "Couldn't load this page" })).toBeTruthy();
    expect(screen.getByText("Gone for now")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeTruthy();
  });
});

describe("authentication", () => {
  it("sends logged-out visitors to /login and remembers where they were going", async () => {
    session = null;
    const router = renderAt("/does-not-exist?month=2026-09");

    expect(await screen.findByRole("heading", { name: "Log in" })).toBeTruthy();
    expect(router.state.location.pathname).toBe("/login");
    expect(new URLSearchParams(router.state.location.search).get("redirectTo")).toBe(
      "/does-not-exist?month=2026-09",
    );
  });

  it("keeps logged-in users away from the login page", async () => {
    const router = renderAt("/login");

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeTruthy();
    expect(router.state.location.pathname).toBe("/");
  });
});

describe("session expiry", () => {
  it("clears cached data and redirects to /login, remembering where the user was", async () => {
    const router = renderAt("/somewhere?month=2026-09");
    redirectToLoginOnSessionExpiry(router);
    await screen.findByRole("heading", { name: "Page not found" });
    queryClient.setQueryData(["finance", "transactions"], ["private data"]);

    session = null;
    server.on("GET /api/v1/me", () =>
      json(401, { error: { code: "UNAUTHORIZED", message: "Not logged in" } }),
    );
    await api.get("/me").catch(() => {});

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(new URLSearchParams(router.state.location.search).get("redirectTo")).toBe(
      "/somewhere?month=2026-09",
    );
    expect(queryClient.getQueryData(["finance", "transactions"])).toBeUndefined();
  });
});
