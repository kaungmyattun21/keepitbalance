import { describe, expect, it } from "vitest";
import {
  mondayOf,
  planningDateRangeSchema,
  planningPeriodSchema,
  resolvePlanningPeriod,
  shiftDay,
  recipeSchema,
  recipeImageSchema,
  RECIPE_IMAGE_MAX_BYTES,
  weekQuerySchema,
  mealSchema,
  updateMealSchema,
  applyGenerationSchema,
} from "./meal-planning.ts";
const id = "11111111-1111-4111-8111-111111111111";
const recipe = {
  name: " Rice ",
  servings: "2",
  steps: " Cook ",
  caloriesPerServing: "300",
  ingredients: [{ ingredientId: id, quantity: "0.1" }],
};
describe("meal planning schemas", () => {
  it("normalizes recipes, validates servings and requires unique ingredients", () => {
    expect(recipeSchema.parse(recipe)).toMatchObject({
      name: "Rice",
      servings: 2,
      steps: "Cook",
      caloriesPerServing: 300,
      ingredients: [{ ingredientId: id, quantity: "0.10" }],
    });
    for (const input of [
      { ...recipe, ingredients: [] },
      { ...recipe, servings: 0 },
      { ...recipe, servings: 1.5 },
      { ...recipe, caloriesPerServing: -1 },
      { ...recipe, ingredients: [...recipe.ingredients, ...recipe.ingredients] },
    ])
      expect(recipeSchema.safeParse(input).success).toBe(false);
  });
  it("accepts optional photo changes and bounds image metadata and encoding", () => {
    expect(recipeSchema.parse({ ...recipe, image: null }).image).toBeNull();
    expect(recipeImageSchema.safeParse({ contentType: "image/png", data: "aGVsbG8=" }).success).toBe(true);
    for (const image of [
      { contentType: "image/svg+xml", data: "aGVsbG8=" },
      { contentType: "image/png", data: "broken!" },
      { contentType: "image/png", data: "abc" },
      { contentType: "image/png", data: "a".repeat(4 * Math.ceil(RECIPE_IMAGE_MAX_BYTES / 3) + 4) },
    ])
      expect(recipeImageSchema.safeParse(image).success).toBe(false);
  });
  it("accepts inclusive custom ranges and rejects reversed, oversized or incomplete ranges", () => {
    const period = { startDate: "2026-10-28", endDate: "2026-11-03" };
    expect(planningDateRangeSchema.parse(period)).toEqual(period);
    expect(resolvePlanningPeriod(period)).toEqual({ ...period, weekStart: "2026-10-26" });
    expect(planningPeriodSchema.safeParse({ weekStart: "2026-10-26" }).success).toBe(true);
    expect(
      planningDateRangeSchema.safeParse({ startDate: "2026-11-01", endDate: "2026-12-01" }).success,
    ).toBe(true);
    for (const values of [
      { startDate: "2026-11-03", endDate: "2026-11-02" },
      { startDate: "2026-11-01", endDate: "2026-12-02" },
      { startDate: "2026-02-30", endDate: "2026-03-02" },
      { startDate: "2026-11-01" },
      { startDate: "9999-12-31", endDate: "9999-12-31" },
      { ...period, weekStart: "2026-10-26" },
    ])
      expect(planningPeriodSchema.safeParse(values).success).toBe(false);
    expect(applyGenerationSchema.safeParse({ ...period, token: "a".repeat(64) }).success).toBe(true);
  });
  it("handles calendar weeks and rejects malformed or partial weeks without throwing", () => {
    expect(mondayOf("2026-11-01")).toBe("2026-10-26");
    expect(shiftDay("2026-12-28", 7)).toBe("2027-01-04");
    expect(weekQuerySchema.parse({ weekStart: "2026-10-26" }).weekStart).toBe("2026-10-26");
    for (const date of ["bad", "2026-02-30", "2026-10-27", "9999-12-27", ""])
      expect(weekQuerySchema.safeParse({ weekStart: date }).success).toBe(false);
  });
  it("validates meal slots and versions and requires a preview fingerprint", () => {
    const meal = { recipeId: id, date: "2026-10-26", slot: "dinner", servings: "3" };
    expect(mealSchema.parse(meal)).toMatchObject({ servings: 3, eaten: false });
    expect(mealSchema.safeParse({ ...meal, slot: "brunch" }).success).toBe(false);
    expect(updateMealSchema.safeParse(meal).success).toBe(false);
    expect(applyGenerationSchema.safeParse({ weekStart: "2026-10-26", token: "old" }).success).toBe(false);
  });
});
