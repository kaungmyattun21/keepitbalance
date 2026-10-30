// @vitest-environment jsdom
import type { Bill, Budget, Category, MonthlyBudgets, Transaction } from "@keepitbalance/shared/finance";
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
import { financeRoute, lazyTransactionsPage } from "./index.ts";

const groceries: Category = {
  id: "11111111-1111-4111-8111-111111111111",
  groupId: "44444444-4444-4444-8444-444444444444",
  name: "Groceries",
  type: "expense",
};
const transport: Category = {
  id: "22222222-2222-4222-8222-222222222222",
  groupId: "44444444-4444-4444-8444-444444444444",
  name: "Transport",
  type: "expense",
};
const salary: Category = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Salary",
  type: "income",
  groupId: "55555555-5555-4555-8555-555555555555",
};

const routes: RouteObject[] = [
  {
    path: "/",
    middleware: [requireSession],
    children: [financeRoute],
  },
  { path: "/login", Component: () => <h1>Log in</h1> },
];

const server = createFetchMock();

function renderFinance(path = "/finance/transactions") {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  );
}

async function fillValidExpense() {
  await userEvent.type(await screen.findByLabelText("Amount"), "42.5");
  await chooseOption(screen.getByLabelText("Category"), "Groceries");
}

const submit = () => userEvent.click(screen.getByRole("button", { name: "Add transaction" }));

async function chooseOption(trigger: HTMLElement, label: string) {
  await userEvent.click(trigger);
  await userEvent.click(await screen.findByRole("option", { name: label }));
}

async function optionNames() {
  await userEvent.click(screen.getByLabelText("Category"));
  const names = screen.getAllByRole("option").map((option) => option.textContent);
  await userEvent.keyboard("{Escape}");
  return names;
}

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
let storedBudgets: Budget[];

function monthlyBudgetsResponse(month: string): MonthlyBudgets {
  return {
    month,
    totalBudget: "0.00",
    totalSpent: "0.00",
    groups: storedBudgets.length
      ? [
          {
            group: { id: groceries.groupId, name: "Essentials" },
            amount: "0.00",
            spent: "0.00",
            remaining: "0.00",
            budgets: storedBudgets,
          },
        ]
      : [],
  };
}

function budgetFixture(category: Category, amount: string, spent: string): Budget {
  const remainingCents = Math.round((Number(amount) - Number(spent)) * 100);
  const remaining = `${remainingCents < 0 ? "-" : ""}${(Math.abs(remainingCents) / 100).toFixed(2)}`;
  return { id: `budget-${category.id}`, category, amount, spent, remaining };
}

const requestedMonths = () =>
  server.calls("GET /api/v1/transactions").map((request) => new URL(request.url).searchParams.get("month"));

beforeAll(async () => {
  // Load route code before interaction tests so module transformation is outside DOM wait timeouts.
  await lazyTransactionsPage();
  // Radix dialogs rely on browser APIs jsdom doesn't implement.
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
});

beforeEach(() => {
  storedTransactions = [];
  storedBudgets = [];
  vi.stubGlobal("fetch", server.fetch);
  server.on("GET /api/v1/auth/get-session", () => json(200, sessionFixture()));
  server.on("GET /api/v1/category-groups", () =>
    json(200, {
      data: [
        { id: groceries.groupId, name: "Essentials", type: "expense", categories: [groceries, transport] },
        { id: salary.groupId, name: "Income", type: "income", categories: [salary] },
      ],
    }),
  );
  server.on("GET /api/v1/bills", () => json(200, { data: [] }));
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
  server.on("GET /api/v1/budgets", (request) =>
    json(200, monthlyBudgetsResponse(new URL(request.url).searchParams.get("month") ?? thisMonth)),
  );
  server.on("GET /api/v1/transactions/summary", (request) =>
    json(200, {
      month: new URL(request.url).searchParams.get("month"),
      totalIncome: "0.00",
      totalExpense: "0.00",
      net: "0.00",
      byCategory: [],
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

    expect(await optionNames()).toEqual(["Groceries", "Transport"]);
    await chooseOption(screen.getByLabelText("Category"), "Groceries");

    await userEvent.click(screen.getByRole("radio", { name: "Income" }));

    expect(await optionNames()).toEqual(["Salary"]);
    expect(screen.getByLabelText("Category").textContent).toBe("Choose a category");
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
    expect(screen.getByLabelText("Category").textContent).toBe("Groceries");
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

    expect((dialog.getByLabelText("Category") as HTMLButtonElement).disabled).toBe(true);
    expect(dialog.getByText("Shopping expenses keep their type and category.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Delete Groceries/ })).toBeNull();
  });
});

describe("finance sections", () => {
  it("opens on the overview with this month's totals and category breakdown", async () => {
    server.on("GET /api/v1/transactions/summary", () =>
      json(200, {
        month: thisMonth,
        totalIncome: "3000.00",
        totalExpense: "3250.50",
        net: "-250.50",
        byCategory: [
          { categoryId: groceries.id, name: "Groceries", type: "expense", total: "3000.00" },
          { categoryId: salary.id, name: "Salary", type: "income", total: "3000.00" },
          { categoryId: transport.id, name: "Transport", type: "expense", total: "250.50" },
        ],
      }),
    );
    renderFinance("/finance");

    expect(await screen.findByRole("heading", { name: `${formatMonth(thisMonth)} overview` })).toBeTruthy();
    expect(screen.getByText("Net balance").nextElementSibling?.textContent).toBe("−250.50");
    const spending = within(screen.getByRole("region", { name: "Spending by category" }));
    expect(spending.getByText("Groceries")).toBeTruthy();
    expect(spending.getByText("92%")).toBeTruthy();
    expect(
      within(screen.getByRole("region", { name: "Income by category" })).getByText("Salary"),
    ).toBeTruthy();
    await waitFor(() => expect(document.title).toBe("Finance overview · KeepItBalance"));
  });

  it("switches sections with links that mark the current one", async () => {
    renderFinance("/finance");
    const sections = within(await screen.findByRole("navigation", { name: "Finance sections" }));
    expect(sections.getByRole("link", { name: "Overview" }).getAttribute("aria-current")).toBe("page");

    await userEvent.click(sections.getByRole("link", { name: "Bills" }));

    expect(await screen.findByRole("heading", { name: "Recurring bills" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "No bills yet" })).toBeTruthy();
    expect(sections.getByRole("link", { name: "Bills" }).getAttribute("aria-current")).toBe("page");

    await userEvent.click(sections.getByRole("link", { name: "Transactions" }));
    expect(await screen.findByRole("region", { name: "Add transaction" })).toBeTruthy();
  });
});

describe("budgets", () => {
  const budgetForm = async () =>
    within(await screen.findByRole("dialog", { name: "Set up your monthly budgets" }));

  it("opens a setup form on the first visit, with expense categories only", async () => {
    renderFinance("/finance/budgets");
    const form = await budgetForm();

    expect(form.getByRole("checkbox", { name: "Groceries" })).toBeTruthy();
    expect(form.getByRole("checkbox", { name: "Transport" })).toBeTruthy();
    expect(form.queryByRole("checkbox", { name: "Salary" })).toBeNull();
    expect(form.getByText("No categories selected.")).toBeTruthy();
  });

  it("selects a category when its amount is typed, totals exactly, and saves as entered", async () => {
    server.on("PUT /api/v1/budgets", async (request) => {
      const { budgets } = (await request.json()) as { budgets: { categoryId: string; amount: string }[] };
      storedBudgets = budgets.map((entry) =>
        budgetFixture(entry.categoryId === groceries.id ? groceries : transport, entry.amount, "0.00"),
      );
      return json(200, monthlyBudgetsResponse(thisMonth));
    });
    renderFinance("/finance/budgets");
    const form = await budgetForm();

    await userEvent.type(form.getByLabelText("Monthly budget for Groceries"), "412.3");
    await userEvent.type(form.getByLabelText("Monthly budget for Transport"), "0.2");

    expect((form.getByRole("checkbox", { name: "Groceries" }) as HTMLInputElement).checked).toBe(true);
    expect(form.getAllByText("412.50")).toHaveLength(2);
    await userEvent.click(form.getByRole("button", { name: "Save budgets" }));

    expect(await screen.findByText("Budgets saved.")).toBeTruthy();
    const [request] = server.calls("PUT /api/v1/budgets");
    expect(await request!.json()).toEqual({
      budgets: [
        { categoryId: groceries.id, amount: "412.30" },
        { categoryId: transport.id, amount: "0.20" },
      ],
    });
    expect(await screen.findByRole("region", { name: "Monthly budgets" })).toBeTruthy();
  });

  it("asks for an amount when a category is ticked without one", async () => {
    renderFinance("/finance/budgets");
    const form = await budgetForm();

    await userEvent.click(form.getByRole("checkbox", { name: "Groceries" }));
    await userEvent.click(form.getByRole("button", { name: "Save budgets" }));

    expect(await form.findByText("Enter an amount like 12.50.")).toBeTruthy();
    expect(form.getByLabelText("Monthly budget for Groceries").getAttribute("aria-invalid")).toBe("true");
    expect(server.calls("PUT /api/v1/budgets")).toHaveLength(0);
  });

  it("can be skipped, then set up from the empty state", async () => {
    renderFinance("/finance/budgets");
    const form = await budgetForm();

    await userEvent.click(form.getByRole("button", { name: "Skip for now" }));
    expect(await screen.findByRole("heading", { name: "No budgets yet" })).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Set up budgets" }));
    expect(await budgetForm()).toBeTruthy();
  });

  it("shows spending against each budget and edits them with the same form", async () => {
    storedBudgets = [
      budgetFixture(groceries, "420.00", "389.80"),
      budgetFixture(transport, "100.00", "112.50"),
    ];
    server.on("PUT /api/v1/budgets", async (request) => {
      const { budgets } = (await request.json()) as { budgets: unknown[] };
      storedBudgets = budgets.length === 0 ? [] : storedBudgets;
      return json(200, monthlyBudgetsResponse(thisMonth));
    });
    renderFinance("/finance/budgets");

    const list = within(await screen.findByRole("region", { name: "Monthly budgets" }));
    expect(list.getByText("30.20 left (93% used)")).toBeTruthy();
    expect(list.getByText("Over by 12.50 (113% used)")).toBeTruthy();

    await userEvent.click(list.getByRole("button", { name: "Manage budgets" }));
    const form = within(await screen.findByRole("dialog", { name: "Manage budgets" }));
    expect((form.getByLabelText("Monthly budget for Groceries") as HTMLInputElement).value).toBe("420.00");
    await userEvent.click(form.getByRole("checkbox", { name: "Groceries" }));
    await userEvent.click(form.getByRole("checkbox", { name: "Transport" }));
    await userEvent.click(form.getByRole("button", { name: "Save budgets" }));

    expect(await screen.findByText("Budgets removed.")).toBeTruthy();
    expect(await screen.findByRole("heading", { name: "No budgets yet" })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("removes a cleared budget after validation while keeping other amounts", async () => {
    storedBudgets = [
      budgetFixture(groceries, "420.00", "20.00"),
      budgetFixture(transport, "100.00", "10.00"),
    ];
    server.on("PUT /api/v1/budgets", async (request) => {
      const { budgets } = (await request.json()) as { budgets: { categoryId: string; amount: string }[] };
      storedBudgets = budgets.map((entry) =>
        budgetFixture(entry.categoryId === groceries.id ? groceries : transport, entry.amount, "0.00"),
      );
      return json(200, monthlyBudgetsResponse(thisMonth));
    });
    renderFinance("/finance/budgets");
    await userEvent.click(await screen.findByRole("button", { name: "Manage budgets" }));
    const form = within(await screen.findByRole("dialog", { name: "Manage budgets" }));
    const amount = form.getByLabelText("Monthly budget for Groceries");
    await userEvent.clear(amount);
    await userEvent.type(amount, "0");
    await userEvent.click(form.getByRole("button", { name: "Save budgets" }));
    expect(await form.findByText("Amount must be greater than 0.")).toBeTruthy();
    await userEvent.clear(amount);
    expect((form.getByRole("checkbox", { name: "Groceries" }) as HTMLInputElement).checked).toBe(false);
    expect(form.queryByText("Amount must be greater than 0.")).toBeNull();
    await userEvent.click(form.getByRole("button", { name: "Save budgets" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await server.calls("PUT /api/v1/budgets")[0]!.json()).toEqual({
      budgets: [{ categoryId: transport.id, amount: "100.00" }],
    });
    expect(
      within(screen.getByRole("region", { name: "Monthly budgets" })).queryByText("Groceries"),
    ).toBeNull();
  });

  it.each(["clear fields", "clear all button"])(
    "starts over after saving empty amounts using %s",
    async (method) => {
      storedBudgets = [
        budgetFixture(groceries, "420.00", "20.00"),
        budgetFixture(transport, "100.00", "10.00"),
      ];
      server.on("PUT /api/v1/budgets", () => {
        storedBudgets = [];
        return json(200, monthlyBudgetsResponse(thisMonth));
      });
      renderFinance("/finance/budgets");
      await userEvent.click(await screen.findByRole("button", { name: "Manage budgets" }));
      const form = within(await screen.findByRole("dialog", { name: "Manage budgets" }));
      if (method === "clear fields") {
        await userEvent.clear(form.getByLabelText("Monthly budget for Groceries"));
        await userEvent.clear(form.getByLabelText("Monthly budget for Transport"));
      } else {
        await userEvent.click(form.getByRole("button", { name: "Clear all amounts" }));
      }
      expect(form.getByText("No categories selected.")).toBeTruthy();
      expect((form.getByLabelText("Monthly budget for Groceries") as HTMLInputElement).value).toBe("");
      expect((form.getByLabelText("Monthly budget for Transport") as HTMLInputElement).value).toBe("");
      expect(server.calls("PUT /api/v1/budgets")).toHaveLength(0);
      await userEvent.click(form.getByRole("button", { name: "Save budgets" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(await server.calls("PUT /api/v1/budgets")[0]!.json()).toEqual({ budgets: [] });
      expect(await screen.findByRole("heading", { name: "No budgets yet" })).toBeTruthy();
      await userEvent.click(screen.getByRole("button", { name: "Set up budgets" }));
      const setup = await budgetForm();
      expect((setup.getByLabelText("Monthly budget for Groceries") as HTMLInputElement).value).toBe("");
    },
  );

  it("dismisses the drawer with Escape, restores focus, and discards unsaved changes", async () => {
    storedBudgets = [budgetFixture(groceries, "420.00", "20.00")];
    renderFinance("/finance/budgets");
    const trigger = await screen.findByRole("button", { name: "Manage budgets" });
    await userEvent.click(trigger);
    let drawer = within(await screen.findByRole("dialog", { name: "Manage budgets" }));
    const amount = drawer.getByLabelText("Monthly budget for Groceries");
    await userEvent.clear(amount);
    await userEvent.type(amount, "999");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
    expect(server.calls("PUT /api/v1/budgets")).toHaveLength(0);

    await userEvent.click(trigger);
    drawer = within(await screen.findByRole("dialog", { name: "Manage budgets" }));
    expect((drawer.getByLabelText("Monthly budget for Groceries") as HTMLInputElement).value).toBe("420.00");
    await userEvent.click(drawer.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("highlights the most-used budgets on the overview", async () => {
    storedBudgets = [
      budgetFixture(groceries, "420.00", "389.80"),
      budgetFixture(transport, "100.00", "112.50"),
    ];
    renderFinance("/finance");

    const highlights = within(await screen.findByRole("region", { name: "Budgets" }));
    const names = highlights.getAllByRole("listitem").map((item) => item.querySelector("span")?.textContent);
    expect(names).toEqual(["Transport", "Groceries"]);
    expect(highlights.getByRole("link", { name: "All budgets" }).getAttribute("href")).toBe(
      `/finance/budgets?month=${thisMonth}`,
    );
  });
});

describe("category management", () => {
  it("groups transaction choices and links to category management", async () => {
    renderFinance();
    const select = await screen.findByLabelText("Category");
    await userEvent.click(select);
    const group = screen.getByRole("group", { name: "Essentials" });
    expect(
      within(group)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Groceries", "Transport"]);
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("link", { name: "Manage categories" }));
    const essentials = within(await screen.findByRole("region", { name: "Essentials" }));
    expect(essentials.getByText("Groceries")).toBeTruthy();
    expect((essentials.getByRole("button", { name: "Delete group" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    await userEvent.click(screen.getByRole("link", { name: "Back to transactions" }));
    expect(await screen.findByRole("region", { name: "Add transaction" })).toBeTruthy();
  });

  it("returns to the selected budget month from category management", async () => {
    storedBudgets = [budgetFixture(groceries, "420.00", "20.00")];
    renderFinance("/finance/budgets?month=2026-09");
    await userEvent.click(await screen.findByRole("link", { name: "Manage categories" }));
    const back = await screen.findByRole("link", { name: "Back to budgets" });
    expect(back.getAttribute("href")).toBe("/finance/budgets?month=2026-09");
    await userEvent.click(back);
    expect(await screen.findByRole("region", { name: "Monthly budgets" })).toBeTruthy();
    expect(screen.getByText(formatMonth("2026-09"))).toBeTruthy();
  });

  it("creates a group through the shared validated form and refreshes the hierarchy", async () => {
    server.on("POST /api/v1/category-groups", async (request) => {
      const input = await request.json();
      server.on("GET /api/v1/category-groups", () =>
        json(200, {
          data: [
            { id: "66666666-6666-4666-8666-666666666666", name: "Travel", type: "expense", categories: [] },
          ],
        }),
      );
      return json(201, input);
    });
    renderFinance("/finance/categories");
    await userEvent.click(await screen.findByRole("button", { name: "Add group" }));
    await userEvent.type(screen.getByLabelText("Group name"), " Travel ");
    await userEvent.click(screen.getByRole("button", { name: "Save group" }));
    expect(await screen.findByRole("region", { name: "Travel" })).toBeTruthy();
    expect(await server.calls("POST /api/v1/category-groups")[0]!.json()).toEqual({
      name: "Travel",
      type: "expense",
    });
    expect(screen.queryByLabelText("Group name")).toBeNull();
  });

  it("moves a category using only groups of its type and invalidates budgets", async () => {
    const destinationId = "66666666-6666-4666-8666-666666666666";
    let moved = false;
    server.on("GET /api/v1/category-groups", () =>
      json(200, {
        data: [
          {
            id: groceries.groupId,
            name: "Essentials",
            type: "expense",
            categories: moved ? [transport] : [groceries, transport],
          },
          {
            id: destinationId,
            name: "Lifestyle",
            type: "expense",
            categories: moved ? [{ ...groceries, groupId: destinationId }] : [],
          },
          { id: salary.groupId, name: "Income", type: "income", categories: [salary] },
        ],
      }),
    );
    server.on(`PATCH /api/v1/categories/${groceries.id}`, async (request) => {
      moved = true;
      return json(200, { ...groceries, ...(await request.json()) });
    });
    queryClient.setQueryData(["finance", "budgets", thisMonth], monthlyBudgetsResponse(thisMonth));
    renderFinance("/finance/categories");
    await userEvent.click(await screen.findByRole("button", { name: "Edit Groceries" }));
    const select = screen.getByLabelText("Group");
    await userEvent.click(select);
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Essentials",
      "Lifestyle",
    ]);
    await userEvent.click(screen.getByRole("option", { name: "Lifestyle" }));
    await userEvent.click(screen.getByRole("button", { name: "Save category" }));
    const lifestyle = within(screen.getByRole("region", { name: "Lifestyle" }));
    expect(await lifestyle.findByText("Groceries")).toBeTruthy();
    expect(await server.calls(`PATCH /api/v1/categories/${groceries.id}`)[0]!.json()).toEqual({
      name: "Groceries",
      groupId: destinationId,
    });
    expect(queryClient.getQueryState(["finance", "budgets", thisMonth])?.isInvalidated).toBe(true);
  });

  it("shows deletion errors and keeps categories in use", async () => {
    server.on(`DELETE /api/v1/categories/${groceries.id}`, () =>
      json(409, {
        error: { code: "CATEGORY_IN_USE", message: "This category is used by transactions or budgets." },
      }),
    );
    renderFinance("/finance/categories");
    await userEvent.click(await screen.findByRole("button", { name: "Delete Groceries" }));
    expect(await screen.findByText("This category is used by transactions or budgets.")).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Essentials" })).getByText("Groceries")).toBeTruthy();
  });
});

describe("recurring bills", () => {
  const today = todayIn("Asia/Yangon");
  const billFixture = (overrides: Partial<Bill> = {}): Bill => ({
    id: "77777777-7777-4777-8777-777777777777",
    name: "Internet",
    amount: "42.50",
    category: groceries,
    frequency: "monthly",
    nextDueDate: today,
    lastPaidDate: null,
    updatedAt: "2026-10-29T08:00:00.000Z",
    ...overrides,
  });

  it("separates overdue, due-today and upcoming payments", async () => {
    server.on("GET /api/v1/bills", () =>
      json(200, {
        data: [
          billFixture({ name: "Overdue internet", nextDueDate: "2020-01-01" }),
          billFixture({ id: "88888888-8888-4888-8888-888888888888", name: "Rent today" }),
          billFixture({
            id: "99999999-9999-4999-8999-999999999999",
            name: "Future subscription",
            nextDueDate: "2099-01-01",
          }),
        ],
      }),
    );
    renderFinance("/finance/bills");
    expect(
      within(await screen.findByRole("region", { name: "Overdue" })).getByText("Overdue internet"),
    ).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Due today" })).getByText("Rent today")).toBeTruthy();
    expect(
      within(screen.getByRole("region", { name: "Upcoming" })).getByText("Future subscription"),
    ).toBeTruthy();
  });

  it("creates a bill in a side drawer with grouped expense categories", async () => {
    server.on("POST /api/v1/bills", async (request) => {
      const values = (await request.json()) as Partial<Bill>;
      const bill = billFixture(values);
      server.on("GET /api/v1/bills", () => json(200, { data: [bill] }));
      return json(201, bill);
    });
    renderFinance("/finance/bills");
    await userEvent.click(await screen.findByRole("button", { name: "Add bill" }));
    const drawer = within(await screen.findByRole("dialog", { name: "Add bill" }));
    await userEvent.type(drawer.getByLabelText("Bill name"), " Internet ");
    await userEvent.type(drawer.getByLabelText("Expected amount"), "42.5");
    const category = drawer.getByLabelText("Expense category");
    await userEvent.click(category);
    expect(screen.getByRole("group", { name: "Essentials" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Salary" })).toBeNull();
    await userEvent.click(screen.getByRole("option", { name: "Groceries" }));
    await userEvent.click(drawer.getByRole("button", { name: "Save bill" }));
    expect(await screen.findByText("Bill created.")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await server.calls("POST /api/v1/bills")[0]!.json()).toEqual({
      name: "Internet",
      amount: "42.50",
      categoryId: groceries.id,
      frequency: "monthly",
      nextDueDate: today,
    });
    expect(screen.getByText("Internet")).toBeTruthy();
  });

  it("edits existing bills and submits their version", async () => {
    const bill = billFixture();
    server.on("GET /api/v1/bills", () => json(200, { data: [bill] }));
    server.on(`PUT /api/v1/bills/${bill.id}`, async (request) =>
      json(200, { ...bill, ...(await request.json()) }),
    );
    renderFinance("/finance/bills");
    await userEvent.click(await screen.findByRole("button", { name: "Edit Internet" }));
    const drawer = within(await screen.findByRole("dialog", { name: "Edit bill" }));
    expect((drawer.getByLabelText("Expected amount") as HTMLInputElement).value).toBe("42.50");
    await userEvent.clear(drawer.getByLabelText("Expected amount"));
    await userEvent.type(drawer.getByLabelText("Expected amount"), "55");
    await chooseOption(drawer.getByLabelText("Repeats"), "Yearly");
    await userEvent.click(drawer.getByRole("button", { name: "Save bill" }));
    expect(await screen.findByText("Bill updated.")).toBeTruthy();
    expect(await server.calls(`PUT /api/v1/bills/${bill.id}`)[0]!.json()).toMatchObject({
      amount: "55.00",
      frequency: "yearly",
      updatedAt: bill.updatedAt,
    });
  });

  it("records an actual payment and refreshes bills, transactions and budgets", async () => {
    const bill = billFixture();
    server.on("GET /api/v1/bills", () => json(200, { data: [bill] }));
    server.on(`POST /api/v1/bills/${bill.id}/payments`, () => {
      server.on("GET /api/v1/bills", () =>
        json(200, { data: [billFixture({ nextDueDate: "2099-01-01", lastPaidDate: today })] }),
      );
      return json(201, { bill, transactionId: "transaction-paid" });
    });
    queryClient.setQueryData(["finance", "budgets", thisMonth], monthlyBudgetsResponse(thisMonth));
    queryClient.setQueryData(["finance", "transactions", "summary", thisMonth], {});
    renderFinance("/finance/bills");
    await userEvent.click(await screen.findByRole("button", { name: "Mark Internet paid" }));
    const dialog = within(await screen.findByRole("dialog", { name: "Mark bill paid" }));
    await userEvent.clear(dialog.getByLabelText("Amount paid"));
    await userEvent.type(dialog.getByLabelText("Amount paid"), "40.1");
    await userEvent.click(dialog.getByRole("button", { name: "Record payment" }));
    expect(await screen.findByText("Bill paid. Expense recorded.")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await server.calls(`POST /api/v1/bills/${bill.id}/payments`)[0]!.json()).toEqual({
      amount: "40.10",
      date: today,
      dueDate: today,
      updatedAt: bill.updatedAt,
    });
    const upcoming = within(await screen.findByRole("region", { name: "Upcoming" }));
    expect(upcoming.getByText("Paid")).toBeTruthy();
    expect(upcoming.getByText(/^Last paid /)).toBeTruthy();
    expect(queryClient.getQueryState(["finance", "budgets", thisMonth])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["finance", "transactions", "summary", thisMonth])?.isInvalidated).toBe(
      true,
    );
  });

  it("keeps the payment dialog open on stale or duplicate payments", async () => {
    const bill = billFixture();
    server.on("GET /api/v1/bills", () => json(200, { data: [bill] }));
    server.on(`POST /api/v1/bills/${bill.id}/payments`, () =>
      json(409, { error: { code: "BILL_CHANGED", message: "This bill was already paid." } }),
    );
    renderFinance("/finance/bills");
    await userEvent.click(await screen.findByRole("button", { name: "Mark Internet paid" }));
    const dialog = within(await screen.findByRole("dialog", { name: "Mark bill paid" }));
    await userEvent.click(dialog.getByRole("button", { name: "Record payment" }));
    expect(await dialog.findByText("This bill was already paid.")).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("confirms deletion and returns to bills from category management", async () => {
    const bill = billFixture();
    server.on("GET /api/v1/bills", () => json(200, { data: [bill] }));
    server.on(`DELETE /api/v1/bills/${bill.id}`, () => {
      server.on("GET /api/v1/bills", () => json(200, { data: [] }));
      return new Response(null, { status: 204 });
    });
    renderFinance("/finance/bills");
    await userEvent.click(await screen.findByRole("link", { name: "Manage categories" }));
    await userEvent.click(await screen.findByRole("link", { name: "Back to bills" }));
    await userEvent.click(await screen.findByRole("button", { name: "Delete Internet" }));
    const dialog = within(await screen.findByRole("alertdialog"));
    expect(dialog.getByText(/Expenses already recorded stay/)).toBeTruthy();
    await userEvent.click(dialog.getByRole("button", { name: /^Delete$/ }));
    expect(await screen.findByRole("region", { name: "No bills yet" })).toBeTruthy();
    expect(server.calls(`DELETE /api/v1/bills/${bill.id}`)).toHaveLength(1);
  });
});
