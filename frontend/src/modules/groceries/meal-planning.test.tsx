// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { Toaster } from "sonner";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Recipe,
  PlanningDateRange,
  MealPlanEntry,
  MealValues,
  RecipeValues,
  GenerationPreview,
} from "@keepitbalance/shared/meal-planning";
import type { ShoppingList } from "@keepitbalance/shared/groceries";
import { requireSession } from "@/modules/auth";
import { queryClient } from "@/shared/lib/query-client";
import { createFetchMock, json } from "@/shared/test/fetch-mock";
import { sessionFixture } from "@/shared/test/session-fixture";
import { groceriesRoute, lazyShoppingListPage } from "./index.ts";
const ids = {
  rice: "11111111-1111-4111-8111-111111111111",
  recipe: "22222222-2222-4222-8222-222222222222",
  meal: "33333333-3333-4333-8333-333333333333",
  list: "44444444-4444-4444-8444-444444444444",
  eggs: "55555555-5555-4555-8555-555555555555",
};
const pngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDnsAAAAASUVORK5CYII=";
const week = "2026-10-26";
const version = "2026-10-31T00:00:00.000Z";
const rice = { id: ids.rice, name: "Rice", unit: "g", inUse: false };
const eggs = { id: ids.eggs, name: "Eggs", unit: "pcs", inUse: true };
const server = createFetchMock();
let recipes: Recipe[];
let savedDates: PlanningDateRange | null;
let meals: MealPlanEntry[];
let current: ShoppingList | null;
let generated: GenerationPreview;
function recipeFixture(): Recipe {
  return {
    id: ids.recipe,
    name: "Rice bowl",
    imageUrl: null,
    servings: 2,
    caloriesPerServing: 300,
    steps: "Cook the rice.",
    updatedAt: version,
    inUse: false,
    ingredients: [{ ingredient: rice, quantity: "300.00" }],
  };
}
function mealFixture(): MealPlanEntry {
  return {
    id: ids.meal,
    recipe: { id: ids.recipe, name: "Rice bowl", servings: 2, caloriesPerServing: 300, imageUrl: null },
    date: week,
    slot: "dinner",
    servings: 3,
    eaten: false,
    updatedAt: version,
  };
}
function renderGroceries(path = "/meals/recipes") {
  const router = createMemoryRouter(
    [{ path: "/", middleware: [requireSession], children: [groceriesRoute] }],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  );
  return router;
}
async function choose(label: string, option: string) {
  await userEvent.click(screen.getByLabelText(label));
  await userEvent.click(await screen.findByRole("option", { name: option }));
}
beforeAll(async () => {
  await lazyShoppingListPage();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});
beforeEach(() => {
  recipes = [];
  savedDates = null;
  meals = [];
  current = null;
  generated = {
    weekStart: week,
    startDate: week,
    endDate: "2026-11-01",
    token: "a".repeat(64),
    listId: null,
    listWeekStart: null,
    mealCount: 1,
    rows: [
      {
        ingredient: rice,
        required: "450.00",
        inPantry: "150.00",
        onList: "0.00",
        toAdd: "300.00",
        excess: "0.00",
        blocked: false,
        planned: true,
      },
    ],
  };
  vi.stubGlobal("fetch", server.fetch);
  server.on("GET /api/v1/auth/get-session", () => json(200, sessionFixture()));
  server.on("GET /api/v1/ingredients", () => json(200, { data: [rice] }));
  server.on("GET /api/v1/category-groups", () => json(200, { data: [] }));
  server.on("GET /api/v1/shopping-lists/current", () =>
    json(200, { data: current, defaultCategoryId: null }),
  );
  server.on("GET /api/v1/meal-plans/preferences", () => json(200, { data: savedDates }));
  server.on("PUT /api/v1/meal-plans/preferences", async (request) => {
    savedDates = (await request.json()) as PlanningDateRange;
    return json(200, { data: savedDates });
  });
  server.on("GET /api/v1/recipes", () => json(200, { data: recipes }));
  server.on("POST /api/v1/recipes", async (request) => {
    const values = (await request.json()) as RecipeValues;
    const created = {
      ...values,
      imageUrl: values.image ? `/recipes/${ids.recipe}/image?v=1` : null,
      id: ids.recipe,
      updatedAt: version,
      inUse: false,
      ingredients: values.ingredients.map((item) => ({ ingredient: rice, quantity: item.quantity })),
    };
    recipes = [...recipes, created];
    return json(201, created);
  });
  server.on(`PUT /api/v1/recipes/${ids.recipe}`, async (request) => {
    const values = (await request.json()) as RecipeValues;
    const saved = {
      ...recipes[0]!,
      ...values,
      imageUrl:
        values.image === undefined
          ? recipes[0]!.imageUrl
          : values.image
            ? `/recipes/${ids.recipe}/image?v=2`
            : null,
      updatedAt: "2026-10-31T00:00:01.000Z",
      ingredients: values.ingredients.map((item) => ({ ingredient: rice, quantity: item.quantity })),
    };
    recipes = [saved];
    return json(200, saved);
  });
  server.on(`DELETE /api/v1/recipes/${ids.recipe}`, () => {
    recipes = [];
    return new Response(null, { status: 204 });
  });
  server.on("GET /api/v1/meal-plans", (request) => {
    const query = new URL(request.url).searchParams;
    const start = query.get("startDate") ?? query.get("weekStart")!;
    const before = query.get("endDate")
      ? new Date(Date.parse(`${query.get("endDate")}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)
      : new Date(Date.parse(`${start}T00:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10);
    return json(200, {
      data: meals.filter((meal) => meal.date >= start && meal.date < before),
    });
  });
  server.on("POST /api/v1/meal-plans", async (request) => {
    const values = (await request.json()) as MealValues;
    const recipe = recipes.find((entry) => entry.id === values.recipeId)!;
    const created = {
      ...values,
      id: ids.meal,
      updatedAt: version,
      recipe: {
        id: recipe.id,
        name: recipe.name,
        servings: recipe.servings,
        caloriesPerServing: recipe.caloriesPerServing,
        imageUrl: recipe.imageUrl,
      },
    };
    meals = [...meals, created];
    return json(201, created);
  });
  server.on(`PATCH /api/v1/meal-plans/${ids.meal}`, async (request) => {
    const values = (await request.json()) as { eaten: boolean };
    meals = meals.map((meal) => ({ ...meal, eaten: values.eaten, updatedAt: "2026-10-31T00:00:01.000Z" }));
    return json(200, meals[0]);
  });
  server.on(`DELETE /api/v1/meal-plans/${ids.meal}`, () => {
    meals = [];
    return new Response(null, { status: 204 });
  });
  server.on("GET /api/v1/shopping-generation", () => json(200, generated));
  server.on("POST /api/v1/shopping-generation", () => {
    current = {
      id: ids.list,
      weekStart: week,
      status: "open",
      completedAt: null,
      updatedAt: version,
      transaction: null,
      items: [
        ...(current?.items ?? []),
        { id: ids.rice, ingredient: rice, quantity: generated.rows[0]!.toAdd, checked: false, price: null },
      ],
    };
    return json(200, {
      data: current,
      addedCount: 1,
      reviewCount: generated.rows.filter((row) => row.blocked).length,
    });
  });
});
afterEach(() => {
  cleanup();
  queryClient.clear();
  server.reset();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("recipe collection", () => {
  it("creates, views, searches and edits a recipe with ingredient quantities and calories", async () => {
    renderGroceries();
    await userEvent.click(await screen.findByRole("button", { name: "Add recipe" }));
    await userEvent.type(screen.getByLabelText("Recipe name"), "Rice bowl");
    await userEvent.upload(
      screen.getByLabelText(/Recipe photo/),
      new File([Uint8Array.from(atob(pngBase64), (c) => c.charCodeAt(0))], "rice.png", { type: "image/png" }),
    );
    expect(await screen.findByAltText("Recipe photo preview")).toBeTruthy();
    await choose("Ingredient", "Rice (g)");
    await userEvent.type(screen.getByLabelText("Quantity (g)"), "300");
    await userEvent.clear(screen.getByLabelText("Calories per serving"));
    await userEvent.type(screen.getByLabelText("Calories per serving"), "300");
    await userEvent.type(screen.getByLabelText("Instructions"), "Cook the rice.");
    await userEvent.click(screen.getByRole("button", { name: "Save recipe" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await server.calls("POST /api/v1/recipes")[0]!.json()).toMatchObject({
      servings: 2,
      caloriesPerServing: 300,
      image: { contentType: "image/png", data: pngBase64 },
      ingredients: [{ ingredientId: ids.rice, quantity: "300.00" }],
    });
    await userEvent.click(screen.getByRole("button", { name: "View Rice bowl" }));
    expect(await screen.findByText("Cook the rice.")).toBeTruthy();
    expect(screen.getByAltText("Rice bowl")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await userEvent.type(screen.getByRole("searchbox", { name: "Search recipes" }), "zzz");
    expect(screen.getByText("No recipes match your search.")).toBeTruthy();
    await userEvent.clear(screen.getByRole("searchbox", { name: "Search recipes" }));
    await userEvent.click(screen.getByRole("button", { name: "Edit Rice bowl" }));
    await userEvent.clear(screen.getByLabelText("Recipe name"));
    await userEvent.type(screen.getByLabelText("Recipe name"), "Brown rice bowl");
    await userEvent.click(screen.getByRole("button", { name: "Save recipe" }));
    expect(await screen.findByRole("button", { name: "View Brown rice bowl" })).toBeTruthy();
    expect(await server.calls(`PUT /api/v1/recipes/${ids.recipe}`)[0]!.json()).toMatchObject({
      updatedAt: version,
    });
    expect(await server.calls(`PUT /api/v1/recipes/${ids.recipe}`)[0]!.json()).not.toHaveProperty("image");
    await userEvent.click(screen.getByRole("button", { name: "Edit Brown rice bowl" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove recipe photo" }));
    expect(screen.queryByAltText("Recipe photo preview")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Save recipe" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await server.calls(`PUT /api/v1/recipes/${ids.recipe}`).at(-1)!.json()).toMatchObject({
      image: null,
    });
  });
  it("validates photo type and size before reading uploads", async () => {
    renderGroceries();
    await userEvent.click(await screen.findByRole("button", { name: "Add recipe" }));
    const user = userEvent.setup({ applyAccept: false });
    const picker = screen.getByLabelText(/Recipe photo/);
    await user.upload(picker, new File(["<svg />"], "image.svg", { type: "image/svg+xml" }));
    expect(screen.getByRole("alert").textContent).toBe("Choose a JPEG, PNG, or WebP image.");
    await user.upload(
      picker,
      new File([new Uint8Array(2 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }),
    );
    expect(screen.getByRole("alert").textContent).toBe("Choose an image up to 2 MB.");
    expect(screen.queryByAltText("Recipe photo preview")).toBeNull();
    expect(server.calls("POST /api/v1/recipes")).toHaveLength(0);
  });
});

describe("weekly meal planning", () => {
  it("shows meals across multiple days immediately and can focus a day or return to the week", async () => {
    recipes = [recipeFixture()];
    meals = [
      mealFixture(),
      {
        ...mealFixture(),
        id: "66666666-6666-4666-8666-666666666666",
        date: "2026-10-28",
        slot: "lunch",
        recipe: { ...mealFixture().recipe, name: "Vegetable soup" },
      },
    ];
    const router = renderGroceries(`/meals/plan?week=${week}`);
    const monday = within(await screen.findByRole("region", { name: `Meals for ${week}` }));
    const wednesday = within(screen.getByRole("region", { name: "Meals for 2026-10-28" }));
    expect(monday.getByRole("button", { name: "Edit meal Rice bowl" })).toBeTruthy();
    expect(wednesday.getByRole("button", { name: "Edit meal Vegetable soup" })).toBeTruthy();
    expect(screen.getByText("2 meals planned · 0 eaten")).toBeTruthy();
    const emptyDay = within(screen.getByRole("region", { name: "Meals for 2026-10-27" }));
    expect(emptyDay.getByText("No meals planned")).toBeTruthy();
    expect(emptyDay.getAllByRole("button")).toHaveLength(1);
    await userEvent.click(screen.getAllByRole("tab")[3]!);
    expect(await screen.findByRole("button", { name: "Edit meal Vegetable soup" })).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Edit meal Rice bowl" })).toBeNull());
    await userEvent.click(screen.getByRole("tab", { name: "Week" }));
    expect(await screen.findByRole("button", { name: "Edit meal Rice bowl" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit meal Vegetable soup" })).toBeTruthy();
    expect(router.state.location.search).toBe(`?week=${week}`);
    expect(router.state.preventScrollReset).toBe(true);
  });
  it("applies custom calendar dates and uses the same range for shopping generation", async () => {
    recipes = [recipeFixture()];
    meals = [
      mealFixture(),
      {
        ...mealFixture(),
        id: "66666666-6666-4666-8666-666666666666",
        date: "2026-11-02",
        recipe: { ...mealFixture().recipe, name: "Soup" },
      },
    ];
    generated = { ...generated, startDate: "2026-10-28", endDate: "2026-11-03" };
    const router = renderGroceries(`/meals/plan?week=${week}`);
    await userEvent.click(await screen.findByRole("button", { name: "Choose planning dates" }));
    const calendar = within(await screen.findByRole("dialog", { name: "Choose planning date range" }));
    expect(await calendar.findByRole("grid")).toBeTruthy();
    expect(calendar.getAllByRole("grid")).toHaveLength(1);
    await userEvent.click(calendar.getByRole("button", { name: /October 28/i }));
    expect((calendar.getByRole("button", { name: "Apply dates" }) as HTMLButtonElement).disabled).toBe(true);
    expect(router.state.location.search).toBe(`?week=${week}`);
    await userEvent.click(calendar.getByRole("button", { name: /November 3/i }));
    await userEvent.click(calendar.getByRole("button", { name: "Apply dates" }));
    await waitFor(() => expect(router.state.location.search).toBe("?start=2026-10-28&end=2026-11-03"));
    expect(await screen.findByRole("tab", { name: "All days", selected: true })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Meals for 2026-10-26" })).toBeNull();
    expect(screen.getByRole("region", { name: "Meals for 2026-11-03" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit meal Soup" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit meal Rice bowl" })).toBeNull();
    const query = new URL(server.calls("GET /api/v1/meal-plans").at(-1)!.url).searchParams;
    expect(query.get("startDate")).toBe("2026-10-28");
    expect(query.get("endDate")).toBe("2026-11-03");
    await userEvent.click(screen.getByRole("button", { name: "Generate shopping list" }));
    const preview = within(await screen.findByRole("dialog", { name: "Shopping preview" }));
    await userEvent.click(await preview.findByRole("button", { name: "Add 1 shortages" }));
    await waitFor(() => expect(server.calls("POST /api/v1/shopping-generation")).toHaveLength(1));
    expect(await server.calls("POST /api/v1/shopping-generation")[0]!.json()).toEqual({
      startDate: "2026-10-28",
      endDate: "2026-11-03",
      token: "a".repeat(64),
    });
    expect(await server.calls("PUT /api/v1/meal-plans/preferences")[0]!.json()).toEqual({
      startDate: "2026-10-28",
      endDate: "2026-11-03",
    });
    await screen.findByRole("heading", { name: "Your shopping list" });
    queryClient.removeQueries({ queryKey: ["groceries", "meal-plan-preferences"] });
    await router.navigate("/meals/plan");
    expect(await screen.findByRole("region", { name: "Meals for 2026-10-28" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Meals for 2026-11-03" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "All days", selected: true })).toBeTruthy();
  });
  it("keeps the selected dates open when saving fails and allows retry", async () => {
    recipes = [recipeFixture()];
    let fail = true;
    server.on("PUT /api/v1/meal-plans/preferences", async (request) => {
      if (fail)
        return json(503, { error: { code: "INTERNAL_ERROR", message: "Couldn't save dates. Try again." } });
      savedDates = (await request.json()) as PlanningDateRange;
      return json(200, { data: savedDates });
    });
    const router = renderGroceries(`/meals/plan?week=${week}`);
    await userEvent.click(await screen.findByRole("button", { name: "Choose planning dates" }));
    const calendar = within(await screen.findByRole("dialog", { name: "Choose planning date range" }));
    await calendar.findByRole("grid");
    await userEvent.click(calendar.getByRole("button", { name: /October 28/i }));
    await userEvent.click(calendar.getByRole("button", { name: /November 3/i }));
    await userEvent.click(calendar.getByRole("button", { name: "Apply dates" }));
    expect(await calendar.findByRole("alert")).toHaveProperty(
      "textContent",
      "Couldn't save dates. Try again.",
    );
    expect(router.state.location.search).toBe(`?week=${week}`);
    expect(savedDates).toBeNull();
    fail = false;
    await userEvent.click(calendar.getByRole("button", { name: "Apply dates" }));
    await waitFor(() => expect(router.state.location.search).toBe("?start=2026-10-28&end=2026-11-03"));
    expect(savedDates).toEqual({ startDate: "2026-10-28", endDate: "2026-11-03" });
  });
  it("plans servings, shows recipe photos, marks a meal eaten, and navigates calendar weeks", async () => {
    recipes = [{ ...recipeFixture(), imageUrl: `/recipes/${ids.recipe}/image?v=1` }];
    renderGroceries(`/meals/plan?week=${week}&day=${week}`);
    const tabs = within(await screen.findByRole("tablist", { name: "Choose a meal planning day" }));
    expect(tabs.getAllByRole("tab")).toHaveLength(8);
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
    const panel = within(screen.getByRole("tabpanel"));
    for (const slot of ["breakfast", "lunch", "dinner", "snack"]) {
      expect(panel.getByRole("region", { name: `${slot} on ${week}` })).toBeTruthy();
    }
    await userEvent.click(await screen.findByRole("button", { name: `Add dinner for ${week}` }));
    await choose("Recipe", "Rice bowl");
    await userEvent.clear(screen.getByLabelText("Planned servings"));
    await userEvent.type(screen.getByLabelText("Planned servings"), "3");
    expect(screen.getByText("900 kcal planned · recipe makes 2 servings.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Save meal" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await server.calls("POST /api/v1/meal-plans")[0]!.json()).toMatchObject({
      recipeId: ids.recipe,
      date: week,
      slot: "dinner",
      servings: 3,
      eaten: false,
    });
    const day = within(screen.getByRole("region", { name: `dinner on ${week}` }));
    expect(day.getByAltText("Rice bowl").getAttribute("src")).toBe(`/api/v1/recipes/${ids.recipe}/image?v=1`);
    expect(day.queryByText("No meal planned")).toBeNull();
    await userEvent.click(day.getByRole("button", { name: "Mark Rice bowl as eaten" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await screen.findByLabelText("900 kcal planned · 900 eaten")).toBeTruthy();
    const eaten = day.getByRole("button", { name: "Mark Rice bowl as planned" });
    expect(eaten.getAttribute("aria-pressed")).toBe("true");
    await userEvent.click(eaten);
    expect(await screen.findByLabelText("900 kcal planned · 0 eaten")).toBeTruthy();
    expect(server.calls("POST /api/v1/pantry")).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "Next week" }));
    await waitFor(() => expect(screen.queryByText("Rice bowl")).toBeNull());
    expect(new URL(server.calls("GET /api/v1/meal-plans").at(-1)!.url).searchParams.get("weekStart")).toBe(
      "2026-11-02",
    );
    await userEvent.click(screen.getByRole("button", { name: "Previous week" }));
    await userEvent.click(
      within(await screen.findByRole("tablist", { name: "Choose a meal planning day" })).getAllByRole(
        "tab",
      )[0]!,
    );
    expect(await screen.findByText("Rice bowl")).toBeTruthy();
  });
  it("selects a day without adding history and deletes a meal from the main page", async () => {
    recipes = [recipeFixture()];
    meals = [mealFixture()];
    const router = renderGroceries(`/meals/plan?week=${week}&day=${week}`);
    const dayPicker = within(await screen.findByRole("tablist", { name: "Choose a meal planning day" }));
    const nextDay = dayPicker.getAllByRole("tab")[2]!;
    await userEvent.click(nextDay);
    await waitFor(() => expect(router.state.location.search).toBe(`?week=${week}&day=2026-10-27`));
    expect(router.state.historyAction).toBe("REPLACE");
    expect(router.state.preventScrollReset).toBe(true);
    await waitFor(() => expect(screen.getAllByRole("tab")[2]!.getAttribute("aria-selected")).toBe("true"));
    expect(screen.queryByRole("button", { name: "Edit meal Rice bowl" })).toBeNull();
    expect(screen.getByRole("button", { name: "Add dinner for 2026-10-27" })).toBeTruthy();
    await userEvent.keyboard("{ArrowLeft}");
    await waitFor(() => expect(router.state.location.search).toBe(`?week=${week}&day=${week}`));
    await userEvent.click(await screen.findByRole("button", { name: "Delete meal Rice bowl" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    const confirm = within(await screen.findByRole("alertdialog", { name: "Remove this planned meal?" }));
    await userEvent.click(confirm.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.queryByRole("button", { name: "Edit meal Rice bowl" })).toBeNull();
    expect(server.calls(`DELETE /api/v1/meal-plans/${ids.meal}`)).toHaveLength(1);
  });
  it("opens the whole current week, follows the user timezone, and focuses today on request", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-01T17:29:00Z")); // Sunday, 23:59 in Asia/Yangon.
    recipes = [recipeFixture()];
    const router = renderGroceries("/meals/plan");
    const selectedDate = () =>
      screen.getByRole("tab", { selected: true }).querySelector("time")?.getAttribute("datetime");
    await waitFor(() => expect(screen.getByRole("tab", { name: "Week", selected: true })).toBeTruthy());
    expect(screen.getByRole("region", { name: "Meals for 2026-11-01" })).toBeTruthy();
    vi.setSystemTime(new Date("2026-11-01T17:31:00Z"));
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    await waitFor(() => expect(screen.getByRole("region", { name: "Meals for 2026-11-02" })).toBeTruthy());
    expect(screen.getByRole("tab", { name: "Week", selected: true })).toBeTruthy();
    expect(new URL(server.calls("GET /api/v1/meal-plans").at(-1)!.url).searchParams.get("weekStart")).toBe(
      "2026-11-02",
    );
    await userEvent.click(screen.getAllByRole("tab")[3]!);
    await waitFor(() => expect(selectedDate()).toBe("2026-11-04"));
    await userEvent.click(screen.getByRole("button", { name: "Today" }));
    await waitFor(() => expect(selectedDate()).toBe("2026-11-02"));
    expect(router.state.location.search).toBe("?week=2026-11-02&day=2026-11-02");
    expect(router.state.preventScrollReset).toBe(true);
  });
  it("shows protected items, applies only safe shortages, and opens the shopping list", async () => {
    recipes = [recipeFixture()];
    meals = [mealFixture()];
    generated.rows.push({
      ingredient: eggs,
      required: "3.00",
      inPantry: "0.00",
      onList: "1.00",
      toAdd: "2.00",
      excess: "0.00",
      blocked: true,
      planned: true,
    });
    const router = renderGroceries(`/meals/plan?week=${week}&day=${week}`);
    await userEvent.click(await screen.findByRole("button", { name: "Generate shopping list" }));
    const preview = within(await screen.findByRole("dialog", { name: "Shopping preview" }));
    expect(await preview.findByText(/Review manually: this item is checked/)).toBeTruthy();
    expect(preview.getByText("150.00")).toBeTruthy();
    const add = preview.getByRole("button", { name: "Add 1 shortages" });
    await waitFor(() => expect((add as HTMLButtonElement).disabled).toBe(false));
    await userEvent.click(add);
    await waitFor(() => expect(server.calls("POST /api/v1/shopping-generation")).toHaveLength(1));
    expect(
      await screen.findByRole("heading", { name: "Your shopping list" }, { timeout: 3000 }),
    ).toBeTruthy();
    expect(router.state.location.pathname).toBe("/meals");
    expect(await server.calls("POST /api/v1/shopping-generation")[0]!.json()).toEqual({
      weekStart: week,
      token: "a".repeat(64),
    });
    expect(current!.items[0]!.quantity).toBe("300.00");
    expect(server.calls("POST /api/v1/transactions")).toHaveLength(0);
  });
  it("requires a fresh preview after a conflict and explains an open list for another week", async () => {
    recipes = [recipeFixture()];
    meals = [mealFixture()];
    server.on("POST /api/v1/shopping-generation", () =>
      json(409, {
        error: { code: "RESOURCE_CHANGED", message: "Your pantry changed. Refresh the preview." },
      }),
    );
    renderGroceries(`/meals/plan?week=${week}&day=${week}`);
    await userEvent.click(await screen.findByRole("button", { name: "Generate shopping list" }));
    const preview = within(await screen.findByRole("dialog", { name: "Shopping preview" }));
    await userEvent.click(await preview.findByRole("button", { name: "Add 1 shortages" }));
    expect(await preview.findByText("Your pantry changed. Refresh the preview.")).toBeTruthy();
    generated = { ...generated, token: "b".repeat(64), listId: ids.list, listWeekStart: "2026-11-02" };
    await userEvent.click(preview.getByRole("button", { name: "Refresh preview" }));
    expect(await preview.findByText(/Your open list belongs to the week/)).toBeTruthy();
    expect((preview.getByRole("button", { name: "Add 1 shortages" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(preview.getByRole("link", { name: "Open shopping list" })).toBeTruthy();
  });
});
