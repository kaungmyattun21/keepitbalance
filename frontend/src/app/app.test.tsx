// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, setUnauthorizedHandler } from "@/shared/lib/api";
import { queryClient } from "@/shared/lib/query-client";
import { routes } from "./routes.ts";
import { redirectToLoginOnSessionExpiry } from "./session-expiry.ts";

const fetchMock = vi.fn<typeof fetch>();

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

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
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  queryClient.clear();
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  localStorage.clear();
  setUnauthorizedHandler(undefined);
});

describe("app shell", () => {
  it("loads the dashboard's data before rendering it", async () => {
    fetchMock.mockResolvedValue(json(200, { status: "ok" }));

    renderAt("/");

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeTruthy();
    expect(screen.getByTestId("api-status").textContent).toBe("ok");
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/health", expect.anything());
  });

  it("shows modules that aren't built yet as disabled, not as links", async () => {
    fetchMock.mockResolvedValue(json(200, { status: "ok" }));

    renderAt("/");
    await screen.findByRole("heading", { name: "Dashboard" });

    expect(screen.getAllByRole("link", { name: "Dashboard" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /Finance/ })).toBeNull();
  });

  it("renders unknown routes as 'not found' inside the shell", async () => {
    renderAt("/does-not-exist");

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeTruthy();
    expect(screen.getAllByRole("navigation", { name: "Main" }).length).toBeGreaterThan(0);
  });

  it("retries a temporary server error automatically", async () => {
    fetchMock.mockResolvedValueOnce(json(500, { error: { code: "INTERNAL_ERROR", message: "Oops" } }));
    fetchMock.mockResolvedValue(json(200, { status: "ok" }));

    renderAt("/");

    expect(await screen.findByRole("heading", { name: "Dashboard" }, { timeout: 3000 })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows an error with a working retry when a loader fails for good", async () => {
    fetchMock.mockResolvedValueOnce(json(404, { error: { code: "NOT_FOUND", message: "Gone for now" } }));
    fetchMock.mockResolvedValue(json(200, { status: "ok" }));

    renderAt("/");

    expect(await screen.findByRole("heading", { name: "Couldn't load this page" })).toBeTruthy();
    expect(screen.getByText("Gone for now")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeTruthy();
  });
});

describe("session expiry", () => {
  it("clears cached data and redirects to /login, remembering where the user was", async () => {
    fetchMock.mockResolvedValue(json(401, { error: { code: "UNAUTHORIZED", message: "Not logged in" } }));
    const router = renderAt("/somewhere?month=2026-09");
    redirectToLoginOnSessionExpiry(router);
    await screen.findByRole("heading", { name: "Page not found" });
    queryClient.setQueryData(["finance", "transactions"], ["private data"]);

    await api.get("/me").catch(() => {});

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(new URLSearchParams(router.state.location.search).get("redirectTo")).toBe(
      "/somewhere?month=2026-09",
    );
    expect(queryClient.getQueryData(["finance", "transactions"])).toBeUndefined();
  });
});
