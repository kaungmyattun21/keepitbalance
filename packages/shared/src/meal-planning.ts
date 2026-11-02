import { z } from "zod";
import { calendarDateSchema } from "./schemas.ts";
import { positiveQuantitySchema, type Ingredient, type ShoppingList } from "./groceries.ts";

export function shiftDay(date: string, offset: number): string {
  const day = new Date(`${date}T00:00:00.000Z`);
  day.setUTCDate(day.getUTCDate() + offset);
  return day.toISOString().slice(0, 10);
}
export function mondayOf(date: string): string {
  const day = new Date(`${date}T00:00:00.000Z`);
  return shiftDay(date, -((day.getUTCDay() + 6) % 7));
}
export const weekQuerySchema = z.object({
  weekStart: calendarDateSchema.refine(
    (date) =>
      calendarDateSchema.safeParse(date).success &&
      mondayOf(date) === date &&
      calendarDateSchema.safeParse(shiftDay(date, 7)).success,
    "Choose the Monday of a week.",
  ),
});
export type WeekQuery = z.output<typeof weekQuerySchema>;
const servingsSchema = z.coerce
  .number<string | number>()
  .int()
  .min(1, "Enter at least 1 serving.")
  .max(1000, "Use at most 1,000 servings.");
export const RECIPE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const recipeImageTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export const recipeImageSchema = z.object({
  contentType: z.enum(recipeImageTypes),
  data: z
    .string()
    .min(4)
    .max(4 * Math.ceil(RECIPE_IMAGE_MAX_BYTES / 3))
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, "Choose a valid image.")
    .refine((data) => data.length % 4 === 0, "Choose a valid image."),
});
export type RecipeImage = z.output<typeof recipeImageSchema>;
export const recipeSchema = z.object({
  name: z.string().trim().min(1, "Enter a recipe name.").max(100),
  image: recipeImageSchema.nullable().optional(),
  servings: servingsSchema,
  steps: z.string().trim().max(10000, "Instructions must be at most 10,000 characters."),
  caloriesPerServing: z.coerce
    .number<string | number>()
    .int()
    .min(0, "Calories cannot be negative.")
    .max(100000),
  ingredients: z
    .array(z.object({ ingredientId: z.uuid("Choose an ingredient."), quantity: positiveQuantitySchema }))
    .min(1, "Add at least one ingredient.")
    .max(50)
    .refine(
      (rows) => new Set(rows.map((row) => row.ingredientId)).size === rows.length,
      "Use each ingredient once and combine its quantity.",
    ),
});
export const updateRecipeSchema = recipeSchema.extend({ updatedAt: z.iso.datetime() });
export type RecipeInput = z.input<typeof recipeSchema>;
export type RecipeValues = z.output<typeof recipeSchema>;
export type UpdateRecipeValues = z.output<typeof updateRecipeSchema>;
export type Recipe = {
  id: string;
  imageUrl: string | null;
  name: string;
  servings: number;
  steps: string;
  caloriesPerServing: number;
  updatedAt: string;
  inUse: boolean;
  ingredients: { ingredient: Ingredient; quantity: string }[];
};
export const mealSlotSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);
export type MealSlot = z.output<typeof mealSlotSchema>;
export const mealSchema = z.object({
  recipeId: z.uuid("Choose a recipe."),
  date: calendarDateSchema,
  slot: mealSlotSchema,
  servings: servingsSchema,
  eaten: z.boolean().default(false),
});
export const updateMealSchema = mealSchema.extend({ updatedAt: z.iso.datetime() });
export const mealEatenSchema = z.object({ eaten: z.boolean(), updatedAt: z.iso.datetime() });
export type MealInput = z.input<typeof mealSchema>;
export type MealValues = z.output<typeof mealSchema>;
export type UpdateMealValues = z.output<typeof updateMealSchema>;
export type MealEatenValues = z.output<typeof mealEatenSchema>;
export type MealPlanEntry = {
  id: string;
  date: string;
  slot: MealSlot;
  servings: number;
  eaten: boolean;
  updatedAt: string;
  recipe: Pick<Recipe, "id" | "name" | "servings" | "caloriesPerServing" | "imageUrl">;
};
export type GenerationRow = {
  ingredient: Ingredient;
  required: string;
  inPantry: string;
  onList: string;
  toAdd: string;
  excess: string;
  blocked: boolean;
  planned: boolean;
};
export type GenerationPreview = {
  weekStart: string;
  token: string;
  listId: string | null;
  listWeekStart: string | null;
  mealCount: number;
  rows: GenerationRow[];
};
export const applyGenerationSchema = weekQuerySchema.extend({
  token: z.string().regex(/^[a-f0-9]{64}$/, "Refresh the shopping preview."),
});
export type ApplyGenerationValues = z.output<typeof applyGenerationSchema>;
export type GenerationResult = { data: ShoppingList | null; addedCount: number; reviewCount: number };
