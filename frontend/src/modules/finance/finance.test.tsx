// @vitest-environment jsdom
import type { Category, Transaction } from "@keepitbalance/shared/finance";
import { QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, type RouteObject } from "react-router";
import { RouterProvider } from "react-router/dom";
import { Toaster } from "sonner";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { requireSession } from "@/modules/auth";
import { currentMonthIn, shiftMonth, todayIn } from "@keepitbalance/shared/dates";
import { formatMonth } from "@/shared/lib/format";
import { queryClient } from "@/shared/lib/query-client";
import { createFetchMock, json } from "@/shared/test/fetch-mock";
import { sessionFixture } from "@/shared/test/session-fixture";
import { lazyFinancePage } from "./index.ts";

const groceries: Category = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Groceries",
  type: "expense",
};
const transport: Category = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Transport",
  type: "expense",
};
const salary: Category = { id: "33333333-3333-4333-8333-333333333333", name: "Salary", type: "income" };

const routes: RouteObject[] = [
  {
    path: "/",
    middleware: [requireSession],
    children: [{ path: "finance", lazy: lazyFinancePage }],
  },
  { path: "/login", Component: () => <h1>Log in</h1> },
];

const server = createFetchMock();

function renderFinance() {
  const router = createMemoryRouter(routes, { initialEntries: ["/finance"] });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  );
}

async function fillValidExpense() {
  await userEvent.type(await screen.findByLabelText("Amount"), "42.5");
  await userEvent.selectOptions(screen.getByLabelText("Category"), "Groceries");
}

const submit = () => userEvent.click(screen.getByRole("button", { name: "Add transaction" }));

const optionNames = () =>
  Array.from((screen.getByLabelText("Category") as HTMLSelectElement).options)
    .filter((option) => !option.disabled)
    .map((option) => option.text);

const thisMonth = currentMonthIn("Asia/Yangon");

function transactionFixture(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    type: "expense",
    amount: "42.50",
    date: `${thisMonth}-05`,
    note: "Weekly shop",
    category: groceries,
    shoppingListId: null,
    createdAt: "2026-10-05T08:00:00.000Z",
    updatedAt: "2026-10-05T08:00:00.000Z",
    ...overrides,
  };
}

let storedTransactions: Transaction[];

const requestedMonths = () =>
  server.calls("GET /api/v1/transactions").map((request) => new URL(request.url).searchParams.get("month"));

beforeAll(() => {
  // Radix dialogs rely on browser APIs jsdom doesn't implement.
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
});

beforeEach(() => {
  storedTransactions = [];
  vi.stubGlobal("fetch", server.fetch);
  server.on("GET /api/v1/auth/get-session", () => json(200, sessionFixture()));
  server.on("GET /api/v1/categories", () => json(200, { data: [salary, groceries, transport] }));
  server.on("GET /api/v1/transactions", () =>
    json(200, {
      data: storedTransactions,
      page: 1,
      pageSize: 20,
      total: storedTransactions.length,
      totalPages: 1,
    }),
  );
});

afterEach(() => {
  cleanup();
  queryClient.clear();
  server.reset();
  vi.unstubAllGlobals();
});

describe("add transaction form", () => {
  it("offers only the categories of the chosen type", async () => {
    renderFinance();
    await screen.findByLabelText("Category");

    expect(optionNames()).toEqual(["Groceries", "Transport"]);
    await userEvent.selectOptions(screen.getByLabelText("Category"), "Groceries");

    await userEvent.click(screen.getByRole("radio", { name: "Income" }));

    expect(optionNames()).toEqual(["Salary"]);
    expect((screen.getByLabelText("Category") as HTMLSelectElement).value).toBe("");
  });

  it("defaults the date to today in the user's timezone", async () => {
    renderFinance();

    expect(((await screen.findByLabelText("Date")) as HTMLInputElement).value).toBe(todayIn("Asia/Yangon"));
  });

  it("validates with the shared schema before sending anything", async () => {
    renderFinance();
    await screen.findByLabelText("Amount");

    await submit();

    expect(await screen.findByText("Enter an amount like 12.50.")).toBeTruthy();
    expect(screen.getByText("Choose a category.")).toBeTruthy();
    expect(server.calls("POST /api/v1/transactions")).toHaveLength(0);
  });

  it("sends the normalized values, confirms, and clears the amount for the next entry", async () => {
    server.on("POST /api/v1/transactions", async (request) => {
      const body = (await request.json()) as Record<string, string>;
      return json(201, {
        id: "t-1",
        ...body,
        note: body.note ?? null,
        category: groceries,
        shoppingListId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
    renderFinance();
    await fillValidExpense();
    await userEvent.type(screen.getByLabelText("Note"), "  Weekly shop  ");

    await submit();

    expect(await screen.findByText("Expense of 42.50 added to Groceries.")).toBeTruthy();
    const [request] = server.calls("POST /api/v1/transactions");
    expect(await request!.json()).toEqual({
      type: "expense",
      amount: "42.50",
      date: todayIn("Asia/Yangon"),
      categoryId: groceries.id,
      note: "Weekly shop",
    });
    expect((screen.getByLabelText("Amount") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Category") as HTMLSelectElement).value).toBe(groceries.id);
  });

  it("shows the server's validation messages next to the fields", async () => {
    server.on("POST /api/v1/transactions", () =>
      json(400, {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request",
          details: [{ location: "body", path: "amount", message: "Amount is too large." }],
        },
      }),
    );
    renderFinance();
    await fillValidExpense();

    await submit();

    expect(await screen.findByText("Amount is too large.")).toBeTruthy();
    expect(screen.getByLabelText("Amount").getAttribute("aria-invalid")).toBe("true");
  });

  it("explains a category that no longer exists and reloads the list", async () => {
    server.on("POST /api/v1/transactions", () =>
      json(404, { error: { code: "NOT_FOUND", message: "Category not found" } }),
    );
    renderFinance();
    await fillValidExpense();

    await submit();

    expect(await screen.findByText("This category no longer exists. Choose another one.")).toBeTruthy();
    await waitFor(() => expect(server.calls("GET /api/v1/categories")).toHaveLength(2));
  });

  it("shows other failures above the form", async () => {
    server.on("POST /api/v1/transactions", () => {
      throw new TypeError("Failed to fetch");
    });
    renderFinance();
    await fillValidExpense();

    await submit();

    expect(
      await screen.findByText("Can't reach the server. Check your connection and try again."),
    ).toBeTruthy();
  });
});

describe("transaction list", () => {
  it("shows this month's transactions in the user's timezone", async () => {
    storedTransactions = [
      transactionFixture(),
      transactionFixture({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        type: "income",
        amount: "2500.00",
        category: salary,
        note: null,
      }),
    ];
    renderFinance();

    const list = within(await screen.findByRole("region", { name: "Transactions" }));
    expect(list.getByText(`2 in ${formatMonth(thisMonth)}`)).toBeTruthy();
    expect(list.getByText("Groceries")).toBeTruthy();
    expect(list.getByText("Expense")).toBeTruthy();
    expect(list.getByText("Income")).toBeTruthy();
    expect(requestedMonths()).toEqual([thisMonth]);
    expect(new URL(server.calls("GET /api/v1/transactions")[0]!.url).searchParams.get("pageSize")).toBe("20");
  });

  it("says so when a month is empty and switches months", async () => {
    renderFinance();
    expect(await screen.findByText(`No transactions in ${formatMonth(thisMonth)} yet.`)).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Previous month" }));

    const previousMonth = shiftMonth(thisMonth, -1);
    expect(await screen.findByText(`No transactions in ${formatMonth(previousMonth)} yet.`)).toBeTruthy();
    expect(requestedMonths()).toContain(previousMonth);
  });

  it("edits a transaction in a dialog and refreshes the list", async () => {
    storedTransactions = [transactionFixture()];
    server.on("PUT /api/v1/transactions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", async (request) => {
      const body = (await request.json()) as { amount: string; note?: string };
      storedTransactions = [transactionFixture({ amount: body.amount, note: body.note ?? null })];
      return json(200, storedTransactions[0]);
    });
    renderFinance();

    await userEvent.click(await screen.findByRole("button", { name: /^Edit Groceries, 42\.50/ }));
    const dialog = within(await screen.findByRole("dialog", { name: "Edit transaction" }));
    expect((dialog.getByLabelText("Note") as HTMLTextAreaElement).value).toBe("Weekly shop");
    await userEvent.clear(dialog.getByLabelText("Amount"));
    await userEvent.type(dialog.getByLabelText("Amount"), "50");
    await userEvent.click(dialog.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Expense of 50.00 updated.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const [request] = server.calls("PUT /api/v1/transactions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(await request!.json()).toEqual({
      type: "expense",
      amount: "50.00",
      date: `${thisMonth}-05`,
      categoryId: groceries.id,
      note: "Weekly shop",
    });
    expect(await screen.findByRole("button", { name: /^Edit Groceries, 50\.00/ })).toBeTruthy();
  });

  it("asks before deleting, then removes the transaction", async () => {
    storedTransactions = [transactionFixture()];
    server.on("DELETE /api/v1/transactions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", () => {
      storedTransactions = [];
      return new Response(null, { status: 204 });
    });
    renderFinance();

    await userEvent.click(await screen.findByRole("button", { name: /^Delete Groceries, 42\.50/ }));
    const confirmation = within(await screen.findByRole("alertdialog", { name: "Delete this transaction?" }));
    await userEvent.click(confirmation.getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("Transaction deleted.")).toBeTruthy();
    expect(await screen.findByText(`No transactions in ${formatMonth(thisMonth)} yet.`)).toBeTruthy();
    expect(server.calls("DELETE /api/v1/transactions/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).toHaveLength(1);
  });

  it("keeps a shopping expense's category locked and offers no delete", async () => {
    storedTransactions = [transactionFixture({ shoppingListId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" })];
    renderFinance();

    await userEvent.click(await screen.findByRole("button", { name: /^Edit Groceries/ }));
    const dialog = within(await screen.findByRole("dialog", { name: "Edit transaction" }));

    expect((dialog.getByLabelText("Category") as HTMLSelectElement).disabled).toBe(true);
    expect(dialog.getByText("Shopping expenses keep their type and category.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Delete Groceries/ })).toBeNull();
  });
});
