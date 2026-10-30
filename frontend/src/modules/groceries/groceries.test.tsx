// @vitest-environment jsdom
import type { Ingredient, PantryItem, ShoppingList } from "@keepitbalance/shared/groceries";
import { todayIn } from "@keepitbalance/shared/dates";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { Toaster } from "sonner";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { requireSession } from "@/modules/auth";
import { queryClient } from "@/shared/lib/query-client";
import { createFetchMock, json } from "@/shared/test/fetch-mock";
import { sessionFixture } from "@/shared/test/session-fixture";
import { groceriesRoute, lazyShoppingListPage } from "./index.ts";

const ids = {
  rice: "11111111-1111-4111-8111-111111111111",
  milk: "22222222-2222-4222-8222-222222222222",
  eggs: "33333333-3333-4333-8333-333333333333",
  list: "44444444-4444-4444-8444-444444444444",
  category: "55555555-5555-4555-8555-555555555555",
  pantry: "66666666-6666-4666-8666-666666666666",
  item: "77777777-7777-4777-8777-777777777777",
};
const version = "2026-10-30T00:00:00.000Z";
const rice: Ingredient = { id: ids.rice, name: "Rice", unit: "g", inUse: false };
const milk: Ingredient = { id: ids.milk, name: "Milk", unit: "ml", inUse: false };
let ingredients: Ingredient[];
let pantry: PantryItem[];
let current: ShoppingList | null;
let history: ShoppingList[];
const server = createFetchMock();

function newList(): ShoppingList {
  return {
    id: ids.list,
    weekStart: "2026-10-26",
    status: "open",
    completedAt: null,
    updatedAt: version,
    transaction: null,
    items: [],
  };
}
function renderGroceries(path = "/meals") {
  const router = createMemoryRouter(
    [
      { path: "/", middleware: [requireSession], children: [groceriesRoute] },
      { path: "/login", Component: () => <h1>Log in</h1> },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  );
}
async function choose(label: string, option: string) {
  await userEvent.click(screen.getByLabelText(label));
  await userEvent.click(await screen.findByRole("option", { name: option }));
}
function touch() {
  if (current) current = { ...current, updatedAt: new Date(Date.parse(current.updatedAt) + 1).toISOString() };
}

beforeAll(async () => {
  await Promise.all([
    lazyShoppingListPage(),
    import("./features/pantry/PantryPage.tsx"),
    import("./features/ingredients/IngredientsPage.tsx"),
    import("./features/shopping-lists/ShoppingHistoryPage.tsx"),
  ]);
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
});
beforeEach(() => {
  ingredients = [rice, milk];
  pantry = [];
  current = null;
  history = [];
  vi.stubGlobal("fetch", server.fetch);
  server.on("GET /api/v1/auth/get-session", () => json(200, sessionFixture()));
  server.on("GET /api/v1/ingredients", () => json(200, { data: ingredients }));
  server.on("POST /api/v1/ingredients", async (request) => {
    const values = (await request.json()) as { name: string; unit: string };
    const created = { id: ids.eggs, ...values, inUse: false };
    ingredients = [...ingredients, created];
    return json(201, created);
  });
  server.on(`PUT /api/v1/ingredients/${ids.rice}`, async (request) => {
    const updated = { ...rice, ...(await request.json()) };
    ingredients = ingredients.map((entry) => (entry.id === ids.rice ? updated : entry));
    return json(200, updated);
  });
  server.on(`DELETE /api/v1/ingredients/${ids.milk}`, () => {
    ingredients = ingredients.filter((entry) => entry.id !== ids.milk);
    return new Response(null, { status: 204 });
  });
  server.on("GET /api/v1/pantry", () => json(200, { data: pantry }));
  server.on("POST /api/v1/pantry", async (request) => {
    const values = (await request.json()) as { ingredientId: string; quantity: string };
    const created: PantryItem = {
      id: ids.pantry,
      ingredient: ingredients.find((entry) => entry.id === values.ingredientId)!,
      quantity: values.quantity,
      updatedAt: version,
    };
    pantry = [...pantry, created];
    return json(201, created);
  });
  server.on(`POST /api/v1/pantry/${ids.pantry}/adjustments`, async (request) => {
    const values = (await request.json()) as { quantity: string; direction: "add" | "remove" };
    const amount =
      Number(pantry[0]!.quantity) + (values.direction === "add" ? 1 : -1) * Number(values.quantity);
    if (amount < 0)
      return json(409, {
        error: { code: "INSUFFICIENT_STOCK", message: "There is not enough stock for that adjustment." },
      });
    pantry = [{ ...pantry[0]!, quantity: amount.toFixed(2) }];
    return json(200, pantry[0]);
  });
  server.on("GET /api/v1/shopping-lists/current", () =>
    json(200, { data: current, defaultCategoryId: ids.category }),
  );
  server.on("GET /api/v1/shopping-lists", () => json(200, { data: history }));
  server.on("POST /api/v1/shopping-lists", () => {
    current = newList();
    return json(201, current);
  });
  server.on(`POST /api/v1/shopping-lists/${ids.list}/items`, async (request) => {
    const values = (await request.json()) as { ingredientId: string; quantity: string };
    current = {
      ...current!,
      items: [
        ...current!.items,
        {
          id: ids.item,
          ingredient: ingredients.find((entry) => entry.id === values.ingredientId)!,
          quantity: values.quantity,
          checked: false,
          price: null,
        },
      ],
    };
    touch();
    return json(201, current);
  });
  server.on(`POST /api/v1/shopping-lists/${ids.list}/items/batch`, async (request) => {
    const values = (await request.json()) as { items: { ingredientId: string; quantity: string }[] };
    for (const value of values.items) {
      const existing = current!.items.find((item) => item.ingredient.id === value.ingredientId);
      if (existing) {
        existing.quantity = (Number(existing.quantity) + Number(value.quantity)).toFixed(2);
        existing.checked = false;
      } else
        current!.items.push({
          id: current!.items.length === 0 ? ids.item : ids.milk,
          ingredient: ingredients.find((entry) => entry.id === value.ingredientId)!,
          quantity: value.quantity,
          checked: false,
          price: null,
        });
    }
    touch();
    return json(201, current);
  });
  server.on("POST /api/v1/ingredients/batch", async (request) => {
    const values = (await request.json()) as { ingredients: { name: string; unit: string }[] };
    const created = values.ingredients.map((value, index) => ({
      id: index === 0 ? ids.eggs : ids.list,
      ...value,
      inUse: false,
    }));
    ingredients = [...ingredients, ...created];
    return json(201, { data: created });
  });
  server.on(`PATCH /api/v1/shopping-lists/${ids.list}/items/${ids.item}`, async (request) => {
    const values = await request.json();
    current = { ...current!, items: current!.items.map((entry) => ({ ...entry, ...values })) };
    touch();
    return json(200, current);
  });
  server.on(`POST /api/v1/shopping-lists/${ids.list}/complete`, async (request) => {
    const values = (await request.json()) as { amount: string; date: string; categoryId: string };
    const completed: ShoppingList = {
      ...current!,
      status: "completed",
      completedAt: version,
      transaction: { id: "expense-1", ...values },
    };
    pantry = current!.items
      .filter((entry) => entry.checked)
      .map((entry) => ({
        id: ids.pantry,
        ingredient: entry.ingredient,
        quantity: entry.quantity,
        updatedAt: version,
      }));
    history = [completed];
    current = null;
    return json(200, completed);
  });
  server.on("GET /api/v1/category-groups", () =>
    json(200, {
      data: [
        {
          id: "88888888-8888-4888-8888-888888888888",
          name: "Essentials",
          type: "expense",
          categories: [
            {
              id: ids.category,
              name: "Groceries",
              type: "expense",
              groupId: "88888888-8888-4888-8888-888888888888",
            },
          ],
        },
      ],
    }),
  );
});
afterEach(() => {
  cleanup();
  queryClient.clear();
  server.reset();
  vi.unstubAllGlobals();
});

describe("groceries", () => {
  it("completes shopping and refreshes pantry, history, budgets and transactions", async () => {
    queryClient.setQueryData(["finance", "budgets", "2026-10"], {});
    queryClient.setQueryData(["finance", "transactions", "summary", "2026-10"], {});
    renderGroceries();
    await userEvent.click(await screen.findByRole("button", { name: "Create shopping list" }));
    await userEvent.click(await screen.findByRole("button", { name: "Add item" }));
    await userEvent.click(screen.getByRole("button", { name: "Search ingredients" }));
    await userEvent.type(screen.getByRole("searchbox", { name: "Search ingredients" }), "ric");
    await userEvent.click(screen.getByLabelText("Ingredient"));
    expect(screen.queryByRole("option", { name: "Milk (ml)" })).toBeNull();
    await userEvent.click(screen.getByRole("option", { name: "Rice (g)" }));
    await userEvent.type(screen.getByLabelText("Quantity (g)"), "500");
    await userEvent.click(screen.getByRole("button", { name: "Save item" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const checkbox = screen.getByRole("checkbox", { name: /Rice/ });
    await userEvent.click(checkbox);
    await waitFor(() => expect((checkbox as HTMLInputElement).checked).toBe(true));
    await userEvent.click(screen.getByRole("button", { name: "Finish shopping" }));
    const drawer = within(await screen.findByRole("dialog", { name: "Finish shopping" }));
    expect(drawer.getByText("Rice: 500.00 g")).toBeTruthy();
    expect(drawer.getByLabelText("Expense category").textContent).toBe("Groceries");
    await userEvent.type(drawer.getByLabelText("Total cost"), "39.9");
    await userEvent.click(drawer.getByRole("button", { name: "Complete shopping" }));
    expect(await screen.findByRole("heading", { name: "Shopping history" })).toBeTruthy();
    expect(screen.getByText("Completed")).toBeTruthy();
    expect(await server.calls(`POST /api/v1/shopping-lists/${ids.list}/complete`)[0]!.json()).toMatchObject({
      amount: "39.90",
      date: todayIn("Asia/Yangon"),
      categoryId: ids.category,
      updatedAt: history[0]!.updatedAt,
    });
    expect(queryClient.getQueryState(["finance", "budgets", "2026-10"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["finance", "transactions", "summary", "2026-10"])?.isInvalidated).toBe(
      true,
    );
    await userEvent.click(screen.getByRole("link", { name: "Pantry" }));
    expect(await screen.findByText("500.00 g")).toBeTruthy();
  });
  it("creates an ingredient inside the pantry form without losing the draft", async () => {
    renderGroceries("/meals/pantry");
    await userEvent.click(await screen.findByRole("button", { name: "Add pantry item" }));
    await choose("Ingredient", "Rice (g)");
    await userEvent.type(screen.getByLabelText("Quantity (g)"), "12");
    await userEvent.click(screen.getByRole("button", { name: "Search ingredients" }));
    await userEvent.type(screen.getByRole("searchbox", { name: "Search ingredients" }), "ri");
    await userEvent.keyboard("{Enter}");
    expect(server.calls("POST /api/v1/pantry")).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "New ingredient" }));
    const dialog = within(await screen.findByRole("dialog", { name: "New ingredient" }));
    await userEvent.type(dialog.getByLabelText("Ingredient name"), " Eggs ");
    await choose("Unit", "Pieces (pcs)");
    await userEvent.click(dialog.getByRole("button", { name: "Save ingredient" }));
    const drawer = within(await screen.findByRole("dialog", { name: "Add pantry item" }));
    expect(drawer.getByLabelText("Ingredient").textContent).toBe("Eggs (pcs)");
    expect(server.calls("POST /api/v1/pantry")).toHaveLength(0);
    expect((drawer.getByLabelText("Quantity (pcs)") as HTMLInputElement).value).toBe("12");
    await userEvent.click(drawer.getByRole("button", { name: "Save pantry item" }));
    expect(await screen.findByText("12.00 pcs")).toBeTruthy();
    expect(await server.calls("POST /api/v1/ingredients")[0]!.json()).toEqual({ name: "Eggs", unit: "pcs" });
    expect(await server.calls("POST /api/v1/pantry")[0]!.json()).toEqual({
      ingredientId: ids.eggs,
      quantity: "12.00",
    });
  });
  it("protects used units and supports ingredient rename and removal", async () => {
    ingredients = [{ ...rice, inUse: true }, milk];
    renderGroceries("/meals/ingredients");
    expect(((await screen.findByRole("button", { name: "Remove Rice" })) as HTMLButtonElement).disabled).toBe(
      true,
    );
    await userEvent.click(screen.getByRole("button", { name: "Edit Rice" }));
    expect((screen.getByLabelText("Unit") as HTMLButtonElement).disabled).toBe(true);
    await userEvent.clear(screen.getByLabelText("Ingredient name"));
    await userEvent.type(screen.getByLabelText("Ingredient name"), "Brown rice");
    await userEvent.click(screen.getByRole("button", { name: "Save ingredient" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText("Brown rice")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Remove Milk" }));
    const dialog = within(await screen.findByRole("alertdialog"));
    await userEvent.click(dialog.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(screen.queryByText("Milk")).toBeNull());
    expect(server.calls(`DELETE /api/v1/ingredients/${ids.milk}`)).toHaveLength(1);
  });
  it("shows insufficient-stock errors and allows a corrected adjustment", async () => {
    pantry = [{ id: ids.pantry, ingredient: rice, quantity: "10.00", updatedAt: version }];
    renderGroceries("/meals/pantry");
    await userEvent.click(await screen.findByRole("button", { name: "Adjust Rice" }));
    await userEvent.type(screen.getByLabelText("Quantity (g)"), "20");
    const drawer = within(screen.getByRole("dialog", { name: "Adjust Rice" }));
    await userEvent.click(drawer.getByRole("button", { name: "Adjust stock" }));
    expect(await drawer.findByText("There is not enough stock for that adjustment.")).toBeTruthy();
    await userEvent.clear(drawer.getByLabelText("Quantity (g)"));
    await userEvent.type(drawer.getByLabelText("Quantity (g)"), "4");
    await userEvent.click(drawer.getByRole("button", { name: "Adjust stock" }));
    expect(await screen.findByText("6.00 g")).toBeTruthy();
  });
  it("keeps a stale checkout open for review without completing the trip", async () => {
    current = {
      ...newList(),
      items: [{ id: ids.item, ingredient: rice, quantity: "500.00", checked: true, price: null }],
    };
    server.on(`POST /api/v1/shopping-lists/${ids.list}/complete`, () =>
      json(409, {
        error: { code: "RESOURCE_CHANGED", message: "The shopping list changed. Review the latest items." },
      }),
    );
    renderGroceries();
    await userEvent.click(await screen.findByRole("button", { name: "Finish shopping" }));
    await userEvent.type(screen.getByLabelText("Total cost"), "10");
    await userEvent.click(screen.getByRole("button", { name: "Complete shopping" }));
    const drawer = within(screen.getByRole("dialog", { name: "Finish shopping" }));
    expect(await drawer.findByText("The shopping list changed. Review the latest items.")).toBeTruthy();
    expect(history).toEqual([]);
    expect(pantry).toEqual([]);
  });
  it("shows unchecked items in read-only history and links to the expense month", async () => {
    history = [
      {
        ...newList(),
        status: "completed",
        completedAt: version,
        transaction: { id: "expense-1", amount: "10.00", date: "2026-10-30", categoryId: ids.category },
        items: [{ id: ids.item, ingredient: milk, quantity: "1000.00", checked: false, price: null }],
      },
    ];
    renderGroceries("/meals/history");
    expect(await screen.findByText("1000.00 ml · Not purchased")).toBeTruthy();
    expect(screen.getByRole("link", { name: "View expense in Finance" }).getAttribute("href")).toBe(
      "/finance/transactions?month=2026-10",
    );
    expect(screen.queryByRole("button", { name: /Edit/ })).toBeNull();
  });
});

describe("multi-row entry", () => {
  it("creates multiple ingredients in one request and supports removing a draft row", async () => {
    renderGroceries("/meals/ingredients");
    await userEvent.click(await screen.findByRole("button", { name: "Add ingredient" }));
    const first = within(screen.getByRole("group", { name: "Ingredient 1" }));
    await userEvent.type(first.getByLabelText("Ingredient name"), " Carrots ");
    await userEvent.click(first.getByLabelText("Unit"));
    await userEvent.click(screen.getByRole("option", { name: "Pieces (pcs)" }));
    await userEvent.click(screen.getByRole("button", { name: "Add another ingredient" }));
    await userEvent.type(
      within(screen.getByRole("group", { name: "Ingredient 2" })).getByLabelText("Ingredient name"),
      "Flour",
    );
    await userEvent.click(screen.getByRole("button", { name: "Add another ingredient" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove ingredient row 3" }));
    await userEvent.click(screen.getByRole("button", { name: "Save ingredients" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText("Carrots")).toBeTruthy();
    expect(screen.getByText("Flour")).toBeTruthy();
    expect(server.calls("POST /api/v1/ingredients/batch")).toHaveLength(1);
    expect(await server.calls("POST /api/v1/ingredients/batch")[0]!.json()).toEqual({
      ingredients: [
        { name: "Carrots", unit: "pcs" },
        { name: "Flour", unit: "g" },
      ],
    });
  });
  it("adds several shopping items together and validates each row before saving", async () => {
    current = newList();
    renderGroceries();
    await userEvent.click(await screen.findByRole("button", { name: "Add item" }));
    const first = within(screen.getByRole("group", { name: "Item 1" }));
    await userEvent.click(first.getByLabelText("Ingredient"));
    await userEvent.click(screen.getByRole("option", { name: "Rice (g)" }));
    await userEvent.type(first.getByLabelText("Quantity (g)"), "500");
    await userEvent.click(screen.getByRole("button", { name: "Add another item" }));
    const second = within(screen.getByRole("group", { name: "Item 2" }));
    await userEvent.click(second.getByLabelText("Ingredient"));
    await userEvent.click(screen.getByRole("option", { name: "Milk (ml)" }));
    await userEvent.click(screen.getByRole("button", { name: "Save items" }));
    expect(await second.findByText("Enter a quantity with at most 2 decimals.")).toBeTruthy();
    expect(server.calls(`POST /api/v1/shopping-lists/${ids.list}/items/batch`)).toHaveLength(0);
    await userEvent.type(second.getByLabelText("Quantity (ml)"), "1000");
    await userEvent.click(screen.getByRole("button", { name: "Add another item" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove item row 3" }));
    await userEvent.click(screen.getByRole("button", { name: "Save items" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("checkbox", { name: /Rice/ })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: /Milk/ })).toBeTruthy();
    expect(await server.calls(`POST /api/v1/shopping-lists/${ids.list}/items/batch`)[0]!.json()).toEqual({
      items: [
        { ingredientId: ids.rice, quantity: "500.00" },
        { ingredientId: ids.milk, quantity: "1000.00" },
      ],
    });
  });
  it("keeps every draft row when a batch is rejected by the server", async () => {
    server.on("POST /api/v1/ingredients/batch", () =>
      json(409, { error: { code: "DUPLICATE_NAME", message: "Already in your ingredient catalog: Rice." } }),
    );
    renderGroceries("/meals/ingredients");
    await userEvent.click(await screen.findByRole("button", { name: "Add ingredient" }));
    await userEvent.type(screen.getByLabelText("Ingredient name"), "Sugar");
    await userEvent.click(screen.getByRole("button", { name: "Add another ingredient" }));
    await userEvent.type(
      within(screen.getByRole("group", { name: "Ingredient 2" })).getByLabelText("Ingredient name"),
      "Rice",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save ingredients" }));
    expect(await screen.findByText("Already in your ingredient catalog: Rice.")).toBeTruthy();
    expect(
      (
        within(screen.getByRole("group", { name: "Ingredient 1" })).getByLabelText(
          "Ingredient name",
        ) as HTMLInputElement
      ).value,
    ).toBe("Sugar");
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});

describe("shopping checkbox updates", () => {
  function withTwoItems() {
    current = {
      ...newList(),
      items: [
        { id: ids.item, ingredient: rice, quantity: "500.00", checked: false, price: null },
        { id: ids.milk, ingredient: milk, quantity: "1000.00", checked: false, price: null },
      ],
    };
  }
  it("checks immediately without disabling other rows, reordering, or refetching grocery data", async () => {
    withTwoItems();
    let releaseRice: (() => void) | undefined;
    let releaseMilk: (() => void) | undefined;
    server.on(
      `PATCH /api/v1/shopping-lists/${ids.list}/items/${ids.item}`,
      () =>
        new Promise<Response>((resolve) => {
          releaseRice = () => {
            current = {
              ...current!,
              items: current!.items.map((item) => (item.id === ids.item ? { ...item, checked: true } : item)),
            };
            touch();
            resolve(json(200, { ...current, items: [...current!.items].reverse() }));
          };
        }),
    );
    server.on(
      `PATCH /api/v1/shopping-lists/${ids.list}/items/${ids.milk}`,
      () =>
        new Promise<Response>((resolve) => {
          releaseMilk = () => {
            current = {
              ...current!,
              items: current!.items.map((item) => (item.id === ids.milk ? { ...item, checked: true } : item)),
            };
            touch();
            resolve(json(200, current));
          };
        }),
    );
    renderGroceries();
    const riceCheck = (await screen.findByRole("checkbox", { name: /Rice/ })) as HTMLInputElement;
    const milkCheck = screen.getByRole("checkbox", { name: /Milk/ }) as HTMLInputElement;
    const initialOrder = screen.getAllByRole("checkbox").map((input) => input.closest("label")?.textContent);
    const listReads = server.calls("GET /api/v1/shopping-lists/current").length;
    const ingredientReads = server.calls("GET /api/v1/ingredients").length;
    await userEvent.click(riceCheck);
    await waitFor(() => expect(riceCheck.checked).toBe(true));
    expect(milkCheck.disabled).toBe(false);
    await userEvent.click(milkCheck);
    await waitFor(() => expect(milkCheck.checked).toBe(true));
    expect(screen.getByRole("button", { name: "Finish shopping" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
    const finishButton = screen.getByRole("button", { name: "Finish shopping" });
    expect((finishButton as HTMLButtonElement).disabled).toBe(false);
    await userEvent.click(finishButton);
    expect(screen.queryByRole("dialog", { name: "Finish shopping" })).toBeNull();
    const deleteButton = screen.getByRole("button", { name: "Delete list" });
    expect((deleteButton as HTMLButtonElement).disabled).toBe(false);
    expect(deleteButton.getAttribute("aria-disabled")).toBe("true");
    await userEvent.click(deleteButton);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await waitFor(() => expect(releaseRice).toBeTypeOf("function"));
    await act(async () => {
      releaseRice!();
    });
    await waitFor(() => expect(releaseMilk).toBeTypeOf("function"));
    expect(milkCheck.checked).toBe(true);
    await act(async () => {
      releaseMilk!();
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Finish shopping" }).getAttribute("aria-disabled")).toBe(
        "false",
      ),
    );
    expect(screen.getAllByRole("checkbox").map((input) => input.closest("label")?.textContent)).toEqual(
      initialOrder,
    );
    expect(server.calls("GET /api/v1/shopping-lists/current")).toHaveLength(listReads);
    expect(server.calls("GET /api/v1/ingredients")).toHaveLength(ingredientReads);
    expect(server.calls("GET /api/v1/pantry")).toHaveLength(0);
    expect(server.calls("GET /api/v1/shopping-lists")).toHaveLength(0);
    expect(deleteButton.getAttribute("aria-disabled")).toBe("false");
    await userEvent.click(deleteButton);
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
  });
  it("rolls back only the failed row and reconciles after the remaining checks save", async () => {
    withTwoItems();
    let failRice: (() => void) | undefined;
    let releaseMilk: (() => void) | undefined;
    server.on(
      `PATCH /api/v1/shopping-lists/${ids.list}/items/${ids.item}`,
      () =>
        new Promise<Response>((resolve) => {
          failRice = () =>
            resolve(json(500, { error: { code: "INTERNAL_ERROR", message: "Couldn't save Rice." } }));
        }),
    );
    server.on(
      `PATCH /api/v1/shopping-lists/${ids.list}/items/${ids.milk}`,
      () =>
        new Promise<Response>((resolve) => {
          releaseMilk = () => {
            current = {
              ...current!,
              items: current!.items.map((item) => (item.id === ids.milk ? { ...item, checked: true } : item)),
            };
            touch();
            resolve(json(200, current));
          };
        }),
    );
    renderGroceries();
    const riceCheck = (await screen.findByRole("checkbox", { name: /Rice/ })) as HTMLInputElement;
    const milkCheck = screen.getByRole("checkbox", { name: /Milk/ }) as HTMLInputElement;
    const reads = server.calls("GET /api/v1/shopping-lists/current").length;
    await userEvent.click(riceCheck);
    await userEvent.click(milkCheck);
    await waitFor(() => expect(milkCheck.checked).toBe(true));
    await waitFor(() => expect(failRice).toBeTypeOf("function"));
    await act(async () => {
      failRice!();
    });
    await waitFor(() => expect(riceCheck.checked).toBe(false));
    expect(milkCheck.checked).toBe(true);
    expect(server.calls("GET /api/v1/shopping-lists/current")).toHaveLength(reads);
    await waitFor(() => expect(releaseMilk).toBeTypeOf("function"));
    await act(async () => {
      releaseMilk!();
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Finish shopping" }).getAttribute("aria-disabled")).toBe(
        "false",
      ),
    );
    expect(riceCheck.checked).toBe(false);
    expect(milkCheck.checked).toBe(true);
    expect(server.calls("GET /api/v1/shopping-lists/current")).toHaveLength(reads + 1);
  });
});

describe("shopping prices", () => {
  it("saves a row total without refetching, prefills checkout and preserves the price in history", async () => {
    current = {
      ...newList(),
      items: [{ id: ids.item, ingredient: rice, quantity: "500.00", checked: true, price: null }],
    };
    queryClient.setQueryData(["finance", "budgets", "2026-10"], {});
    renderGroceries();
    const price = await screen.findByRole("textbox", { name: "Total price for Rice" });
    expect(screen.getByText("1 purchased item needs a price")).toBeTruthy();
    const reads = server.calls("GET /api/v1/shopping-lists/current").length;
    await userEvent.type(price, "12.5");
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect((price as HTMLInputElement).value).toBe("12.50"));
    expect(current!.items[0]!.price).toBe("12.50");
    expect(screen.getByText("Checked total: 12.50")).toBeTruthy();
    expect(server.calls("GET /api/v1/shopping-lists/current")).toHaveLength(reads);
    expect(screen.queryByText("1 purchased item needs a price")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Finish shopping" }));
    expect((screen.getByLabelText("Total cost") as HTMLInputElement).value).toBe("12.50");
    expect(screen.getByText(/matching category budget/)).toBeTruthy();
    await userEvent.clear(screen.getByLabelText("Total cost"));
    await userEvent.type(screen.getByLabelText("Total cost"), "13");
    await userEvent.click(screen.getByRole("button", { name: "Complete shopping" }));
    expect(await screen.findByRole("heading", { name: "Shopping history" })).toBeTruthy();
    expect(screen.getByText("500.00 g · 12.50")).toBeTruthy();
    expect(screen.getByText("13.00 spent")).toBeTruthy();
    expect(queryClient.getQueryState(["finance", "budgets", "2026-10"])?.isInvalidated).toBe(true);
  });
  it("validates prices, accepts free items and clears a price back to missing", async () => {
    current = {
      ...newList(),
      items: [{ id: ids.item, ingredient: rice, quantity: "500.00", checked: true, price: "10.00" }],
    };
    renderGroceries();
    const price = await screen.findByRole("textbox", { name: "Total price for Rice" });
    await userEvent.clear(price);
    await userEvent.type(price, "-1");
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(server.calls(`PATCH /api/v1/shopping-lists/${ids.list}/items/${ids.item}`)).toHaveLength(0);
    await userEvent.clear(price);
    await userEvent.type(price, "0");
    await userEvent.tab();
    await waitFor(() => expect(current!.items[0]!.price).toBe("0.00"));
    expect(screen.queryByText("1 purchased item needs a price")).toBeNull();
    await waitFor(() => expect((price as HTMLInputElement).readOnly).toBe(false));
    await userEvent.clear(price);
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(current!.items[0]!.price).toBeNull());
    expect(await screen.findByText("1 purchased item needs a price")).toBeTruthy();
  });
  it("queues a checkbox change behind a price save without losing either optimistic edit", async () => {
    current = {
      ...newList(),
      items: [{ id: ids.item, ingredient: rice, quantity: "500.00", checked: false, price: null }],
    };
    let releasePrice: (() => void) | undefined;
    let releaseCheck: (() => void) | undefined;
    server.on(`PATCH /api/v1/shopping-lists/${ids.list}/items/${ids.item}`, async (request) => {
      const values = (await request.json()) as { checked?: boolean; price?: string };
      return new Promise<Response>((resolve) => {
        const release = () => {
          current = { ...current!, items: current!.items.map((entry) => ({ ...entry, ...values })) };
          touch();
          resolve(json(200, current));
        };
        if (values.price !== undefined) releasePrice = release;
        else releaseCheck = release;
      });
    });
    renderGroceries();
    const price = await screen.findByRole("textbox", { name: "Total price for Rice" });
    const reads = server.calls("GET /api/v1/shopping-lists/current").length;
    await userEvent.type(price, "12.50");
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(releasePrice).toBeTypeOf("function"));
    const checkbox = screen.getByRole("checkbox", { name: /Rice/ }) as HTMLInputElement;
    await userEvent.click(checkbox);
    await waitFor(() => expect(checkbox.checked).toBe(true));
    expect(screen.getByText("Checked total: 12.50")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Finish shopping" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
    await act(async () => releasePrice!());
    await waitFor(() => expect(releaseCheck).toBeTypeOf("function"));
    expect(checkbox.checked).toBe(true);
    expect(screen.getByText("Checked total: 12.50")).toBeTruthy();
    await act(async () => releaseCheck!());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Finish shopping" }).getAttribute("aria-disabled")).toBe(
        "false",
      ),
    );
    expect(current!.items[0]).toMatchObject({ checked: true, price: "12.50" });
    expect(server.calls("GET /api/v1/shopping-lists/current")).toHaveLength(reads);
  });
  it("keeps a failed price draft for retry and rolls back the displayed total", async () => {
    current = {
      ...newList(),
      items: [{ id: ids.item, ingredient: rice, quantity: "500.00", checked: true, price: "10.00" }],
    };
    server.on(`PATCH /api/v1/shopping-lists/${ids.list}/items/${ids.item}`, () =>
      json(500, { error: { code: "INTERNAL_ERROR", message: "Price could not be saved." } }),
    );
    renderGroceries();
    const price = await screen.findByRole("textbox", { name: "Total price for Rice" });
    await userEvent.clear(price);
    await userEvent.type(price, "20");
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByText("Price could not be saved.")).toBeTruthy();
    expect((price as HTMLInputElement).value).toBe("20");
    expect(screen.getByText("Checked total: 10.00")).toBeTruthy();
    expect((screen.getByRole("checkbox", { name: /Rice/ }) as HTMLInputElement).checked).toBe(true);
  });
});

describe("shopping list reconciliation", () => {
  it("includes remote purchases in checkout along with the confirmed server version", async () => {
    current = {
      ...newList(),
      items: [{ id: ids.item, ingredient: rice, quantity: "500.00", checked: false, price: "10.00" }],
    };
    renderGroceries();
    const checkbox = await screen.findByRole("checkbox", { name: /Rice/ });
    // Another tab adds a purchase before this tab saves its checkbox.
    current = {
      ...current!,
      items: [
        ...current!.items,
        { id: ids.milk, ingredient: milk, quantity: "1000.00", checked: true, price: "20.00" },
      ],
    };
    touch();
    await userEvent.click(checkbox);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Finish shopping" }).getAttribute("aria-disabled")).toBe(
        "false",
      ),
    );
    await userEvent.click(screen.getByRole("button", { name: "Finish shopping" }));
    const drawer = within(await screen.findByRole("dialog", { name: "Finish shopping" }));
    expect(drawer.getByText("Purchased items (2)")).toBeTruthy();
    expect((drawer.getByLabelText("Total cost") as HTMLInputElement).value).toBe("30.00");
    await userEvent.click(drawer.getByRole("button", { name: "Complete shopping" }));
    expect(await screen.findByRole("heading", { name: "Shopping history" })).toBeTruthy();
    const submitted = await server.calls(`POST /api/v1/shopping-lists/${ids.list}/complete`)[0]!.json();
    expect(submitted).toMatchObject({ amount: "30.00", updatedAt: history[0]!.updatedAt });
  });
  it("refreshes untouched price fields without submitting the old value on blur", async () => {
    current = {
      ...newList(),
      items: [{ id: ids.item, ingredient: rice, quantity: "500.00", checked: true, price: "10.00" }],
    };
    renderGroceries();
    const price = (await screen.findByRole("textbox", { name: "Total price for Rice" })) as HTMLInputElement;
    current = { ...current!, items: current!.items.map((item) => ({ ...item, price: "20.00" })) };
    touch();
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ["groceries", "current"] });
    });
    expect(await screen.findByText("Checked total: 20.00")).toBeTruthy();
    await waitFor(() => expect(price.value).toBe("20.00"));
    await userEvent.click(price);
    await userEvent.tab();
    expect(server.calls(`PATCH /api/v1/shopping-lists/${ids.list}/items/${ids.item}`)).toHaveLength(0);
  });
  it("preserves an unsaved price draft across a server refresh", async () => {
    current = {
      ...newList(),
      items: [{ id: ids.item, ingredient: rice, quantity: "500.00", checked: true, price: "10.00" }],
    };
    renderGroceries();
    const price = (await screen.findByRole("textbox", { name: "Total price for Rice" })) as HTMLInputElement;
    await userEvent.clear(price);
    await userEvent.type(price, "15");
    current = { ...current!, items: current!.items.map((item) => ({ ...item, price: "20.00" })) };
    touch();
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ["groceries", "current"] });
    });
    expect(await screen.findByText("Checked total: 20.00")).toBeTruthy();
    expect(price.value).toBe("15");
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(price.value).toBe("15.00"));
    expect(current!.items[0]!.price).toBe("15.00");
  });
  it("keeps a pending checkbox checked during a refetch caused by removing another item", async () => {
    current = {
      ...newList(),
      items: [
        { id: ids.item, ingredient: rice, quantity: "500.00", checked: false, price: "10.00" },
        { id: ids.milk, ingredient: milk, quantity: "1000.00", checked: false, price: null },
      ],
    };
    let release: (() => void) | undefined;
    server.on(
      `PATCH /api/v1/shopping-lists/${ids.list}/items/${ids.item}`,
      () =>
        new Promise<Response>((resolve) => {
          release = () => {
            current = {
              ...current!,
              items: current!.items.map((item) => (item.id === ids.item ? { ...item, checked: true } : item)),
            };
            touch();
            resolve(json(200, current));
          };
        }),
    );
    server.on(`DELETE /api/v1/shopping-lists/${ids.list}/items/${ids.milk}`, () => {
      current = { ...current!, items: current!.items.filter((item) => item.id !== ids.milk) };
      touch();
      return json(200, current);
    });
    renderGroceries();
    const checkbox = (await screen.findByRole("checkbox", { name: /Rice/ })) as HTMLInputElement;
    const reads = server.calls("GET /api/v1/shopping-lists/current").length;
    await userEvent.click(checkbox);
    await waitFor(() => expect(checkbox.checked).toBe(true));
    await waitFor(() => expect(release).toBeTypeOf("function"));
    await userEvent.click(screen.getByRole("button", { name: "Remove Milk" }));
    await waitFor(() => expect(screen.queryByRole("checkbox", { name: /Milk/ })).toBeNull());
    expect(server.calls("GET /api/v1/shopping-lists/current")).toHaveLength(reads + 1);
    expect(checkbox.checked).toBe(true);
    await act(async () => release!());
    await waitFor(() => expect(checkbox.getAttribute("aria-disabled")).toBe("false"));
    expect(current!.items[0]!.checked).toBe(true);
    expect(checkbox.checked).toBe(true);
  });
});
