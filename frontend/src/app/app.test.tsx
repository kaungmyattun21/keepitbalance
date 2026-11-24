// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { todayIn } from "@keepitbalance/shared/dates";
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
    expect(screen.getAllByRole("link", { name: /Groceries/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /Health/ })).toBeNull();
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

describe("quick transaction log", () => {
  const expenseId = "11111111-1111-4111-8111-111111111111";
  const incomeId = "22222222-2222-4222-8222-222222222222";
  const categories = [
    { id: expenseId, name: "Groceries", type: "expense", groupId: "33333333-3333-4333-8333-333333333333" },
    { id: incomeId, name: "Salary", type: "income", groupId: "44444444-4444-4444-8444-444444444444" },
  ];
  const groups = categories.map((category) => ({
    id: category.groupId,
    name: category.type === "expense" ? "Essentials" : "Income",
    type: category.type,
    categories: [category],
  }));
  function savedTransaction(values: Record<string, unknown>) {
    return {
      id: "transaction-1",
      ...values,
      category: categories.find((category) => category.id === values.categoryId),
      shoppingListId: null,
      receipt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  beforeEach(() => {
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.releasePointerCapture = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
    server.on("GET /api/v1/category-groups", () => json(200, { data: groups }));
    server.on("POST /api/v1/transactions", async (request) =>
      json(201, savedTransaction(await request.json())),
    );
  });
  async function openLog() {
    await screen.findByRole("heading", { name: "Dashboard" });
    const nav = within(document.querySelector('[data-slot="bottom-navigation"]') as HTMLElement);
    const trigger = nav.getByRole("button", { name: "Log transaction" });
    await userEvent.click(trigger);
    const drawer = within(await screen.findByRole("dialog", { name: "Log transaction" }));
    await drawer.findByRole("group", { name: "Amount keypad" });
    return { drawer, trigger };
  }
  async function chooseCategory(option: string) {
    await userEvent.click(screen.getByLabelText("Category"));
    await userEvent.click(await screen.findByRole("option", { name: option }));
  }
  it("logs from the center button without leaving the screen and refreshes finance totals", async () => {
    const router = renderAt("/");
    await screen.findByRole("heading", { name: "Dashboard" });
    expect(server.calls("GET /api/v1/category-groups")).toHaveLength(0);
    const nav = within(document.querySelector('[data-slot="bottom-navigation"]') as HTMLElement);
    const plus = nav.getByRole("button", { name: "Log transaction" });
    expect(
      nav.getByRole("link", { name: "Finance" }).compareDocumentPosition(plus) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      plus.compareDocumentPosition(nav.getByRole("link", { name: "Groceries" })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    queryClient.setQueryData(["finance", "budgets", "2026-10"], {});
    queryClient.setQueryData(["finance", "transactions", "summary", "2026-10"], {});
    const { drawer, trigger } = await openLog();
    for (const key of ["1", "2", "3", "Decimal point", "4", "5", "Delete last digit", "5"])
      await userEvent.click(drawer.getByRole("button", { name: key }));
    expect((drawer.getByLabelText("Amount") as HTMLInputElement).value).toBe("123.45");
    await chooseCategory("Groceries");
    await userEvent.click(drawer.getByRole("button", { name: "Add note" }));
    await userEvent.type(drawer.getByLabelText("Note"), "Market trip");
    expect(drawer.queryByRole("group", { name: "Amount keypad" })).toBeNull();
    await userEvent.click(drawer.getByRole("button", { name: "Show keypad" }));
    expect(drawer.getByRole("group", { name: "Amount keypad" })).toBeTruthy();

    await userEvent.click(drawer.getByRole("button", { name: "Save expense" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Log transaction" })).toBeNull());
    expect(await server.calls("POST /api/v1/transactions")[0]!.json()).toEqual({
      type: "expense",
      amount: "123.45",
      date: todayIn("Asia/Yangon"),
      categoryId: expenseId,
      note: "Market trip",
    });
    expect(router.state.location.pathname).toBe("/");
    expect(queryClient.getQueryState(["finance", "budgets", "2026-10"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["finance", "transactions", "summary", "2026-10"])?.isInvalidated).toBe(
      true,
    );
    expect(document.activeElement).toBe(trigger);
  });
  it("validates, switches category type, accepts keyboard input, and keeps a failed draft for retry", async () => {
    renderAt("/");
    const { drawer } = await openLog();
    await userEvent.click(drawer.getByRole("button", { name: "Save expense" }));
    expect(server.calls("POST /api/v1/transactions")).toHaveLength(0);
    expect(await drawer.findByText("Choose a category.")).toBeTruthy();
    await userEvent.click(drawer.getByLabelText("Amount"));
    await userEvent.keyboard("42.");
    await chooseCategory("Groceries");
    await userEvent.click(drawer.getByRole("radio", { name: "Income" }));
    expect(drawer.getByLabelText("Category").textContent).toBe("Choose a category");
    await chooseCategory("Salary");
    server.on("POST /api/v1/transactions", () =>
      json(500, { error: { code: "INTERNAL_ERROR", message: "Couldn't save this transaction." } }),
    );
    await userEvent.click(drawer.getByRole("button", { name: "Save income" }));
    expect(await drawer.findByText("Couldn't save this transaction.")).toBeTruthy();
    expect((drawer.getByLabelText("Amount") as HTMLInputElement).value).toBe("42");
    expect(drawer.getByLabelText("Category").textContent).toBe("Salary");
    let finish: (() => void) | undefined;
    server.on("POST /api/v1/transactions", async (request) => {
      const values = await request.json();
      return new Promise<Response>((resolve) => {
        finish = () => resolve(json(201, savedTransaction(values)));
      });
    });
    await userEvent.click(drawer.getByRole("button", { name: "Save income" }));
    await waitFor(() => expect(finish).toBeTypeOf("function"));
    expect((drawer.getByRole("button", { name: "Saving…" }) as HTMLButtonElement).disabled).toBe(true);
    expect((drawer.getByRole("button", { name: "1" }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => finish!());
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Log transaction" })).toBeNull());
    expect(await server.calls("POST /api/v1/transactions")[1]!.json()).toMatchObject({
      type: "income",
      amount: "42.00",
      categoryId: incomeId,
    });
  });
  it("shows a local retry when categories fail to load and resets after dismissal", async () => {
    server.on("GET /api/v1/category-groups", () =>
      json(404, { error: { code: "NOT_FOUND", message: "Unavailable" } }),
    );
    renderAt("/");
    await screen.findByRole("heading", { name: "Dashboard" });
    const nav = within(document.querySelector('[data-slot="bottom-navigation"]') as HTMLElement);
    await userEvent.click(nav.getByRole("button", { name: "Log transaction" }));
    const drawer = within(await screen.findByRole("dialog", { name: "Log transaction" }));
    expect(await drawer.findByText("Couldn't load categories. Please try again.")).toBeTruthy();
    server.on("GET /api/v1/category-groups", () => json(200, { data: groups }));
    await userEvent.click(drawer.getByRole("button", { name: "Retry" }));
    await drawer.findByRole("group", { name: "Amount keypad" });
    await userEvent.click(drawer.getByRole("button", { name: "9" }));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Log transaction" })).toBeNull());
    const reopened = await openLog();
    expect((reopened.drawer.getByLabelText("Amount") as HTMLInputElement).value).toBe("");
    expect(server.calls("POST /api/v1/transactions")).toHaveLength(0);
  });
});
