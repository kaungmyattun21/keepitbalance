import { describe, expect, it } from "vitest";
import {
  mondayOf,
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
