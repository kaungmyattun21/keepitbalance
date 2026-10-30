import { z } from "zod";
import { calendarDateSchema, moneySchema } from "./schemas.ts";
import { positiveMoneySchema } from "./finance.ts";

export const quantitySchema = z
  .string()
  .trim()
  .regex(/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/, "Enter a quantity with at most 2 decimals.")
  .transform((value) => {
    const [whole, fraction = ""] = value.split(".");
    return `${whole}.${fraction.padEnd(2, "0")}`;
  });
export const positiveQuantitySchema = quantitySchema.refine(
  (value) => value !== "0.00",
  "Quantity must be greater than 0.",
);
export const ingredientUnitSchema = z.enum(["g", "ml", "pcs"]);
export type IngredientUnit = z.output<typeof ingredientUnitSchema>;
export const groceryParamsSchema = z.object({ id: z.uuid("Invalid id.") });
export const shoppingItemParamsSchema = groceryParamsSchema.extend({ itemId: z.uuid("Invalid item id.") });
export const createIngredientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter an ingredient name.")
    .max(100, "Name must be at most 100 characters."),
  unit: ingredientUnitSchema,
});
export const GROCERY_BATCH_MAX = 50;
export const createIngredientsBatchSchema = z
  .object({
    ingredients: z
      .array(createIngredientSchema)
      .min(1, "Add at least one ingredient.")
      .max(GROCERY_BATCH_MAX, `Add at most ${GROCERY_BATCH_MAX} ingredients at once.`),
  })
  .superRefine((value, context) => {
    const names = new Set<string>();
    value.ingredients.forEach((ingredient, index) => {
      const name = ingredient.name.toLowerCase();
      if (names.has(name))
        context.addIssue({
          code: "custom",
          path: ["ingredients", index, "name"],
          message: "Each ingredient name must be unique.",
        });
      names.add(name);
    });
  });
export type IngredientsBatchInput = z.input<typeof createIngredientsBatchSchema>;
export type IngredientsBatchValues = z.output<typeof createIngredientsBatchSchema>;
export const updateIngredientSchema = createIngredientSchema;
export type IngredientInput = z.input<typeof createIngredientSchema>;
export type IngredientValues = z.output<typeof createIngredientSchema>;
export type Ingredient = { id: string; name: string; unit: string; inUse: boolean };
export const createPantryItemSchema = z.object({
  ingredientId: z.uuid("Choose an ingredient."),
  quantity: quantitySchema,
});
export const updatePantryItemSchema = z.object({ quantity: quantitySchema, updatedAt: z.iso.datetime() });
export const adjustPantryItemSchema = z.object({
  direction: z.enum(["add", "remove"]),
  quantity: positiveQuantitySchema,
});
export type CreatePantryInput = z.input<typeof createPantryItemSchema>;
export type CreatePantryValues = z.output<typeof createPantryItemSchema>;
export type UpdatePantryValues = z.output<typeof updatePantryItemSchema>;
export type AdjustPantryValues = z.output<typeof adjustPantryItemSchema>;
export type PantryItem = { id: string; ingredient: Ingredient; quantity: string; updatedAt: string };
export const createShoppingListSchema = z.object({ weekStart: calendarDateSchema.optional() });
export const shoppingListsQuerySchema = z.object({ status: z.enum(["open", "completed"]).optional() });
export type ShoppingListsQuery = z.output<typeof shoppingListsQuerySchema>;
export const createShoppingItemSchema = z.object({
  ingredientId: z.uuid("Choose an ingredient."),
  quantity: positiveQuantitySchema,
});
export const createShoppingItemsBatchSchema = z.object({
  items: z
    .array(createShoppingItemSchema)
    .min(1, "Add at least one item.")
    .max(GROCERY_BATCH_MAX, `Add at most ${GROCERY_BATCH_MAX} items at once.`),
});
export type ShoppingItemsBatchInput = z.input<typeof createShoppingItemsBatchSchema>;
export type ShoppingItemsBatchValues = z.output<typeof createShoppingItemsBatchSchema>;
export const shoppingPriceFormSchema = z.object({
  price: moneySchema.or(z.literal("").transform(() => null)),
});
export type ShoppingPriceInput = z.input<typeof shoppingPriceFormSchema>;
export type ShoppingPriceValues = z.output<typeof shoppingPriceFormSchema>;
export const updateShoppingItemSchema = z
  .object({
    quantity: positiveQuantitySchema.optional(),
    checked: z.boolean().optional(),
    price: moneySchema.nullable().optional(),
  })
  .refine(
    (value) => value.quantity !== undefined || value.checked !== undefined || value.price !== undefined,
    "Provide a quantity, checked state or price.",
  );
export type ShoppingItemInput = z.input<typeof createShoppingItemSchema>;
export type ShoppingItemValues = z.output<typeof createShoppingItemSchema>;
export type UpdateShoppingItemValues = z.output<typeof updateShoppingItemSchema>;
export const completeShoppingListSchema = z.object({
  amount: positiveMoneySchema,
  date: calendarDateSchema,
  categoryId: z.uuid("Choose an expense category."),
  updatedAt: z.iso.datetime(),
});
export type CompleteShoppingInput = z.input<typeof completeShoppingListSchema>;
export type CompleteShoppingValues = z.output<typeof completeShoppingListSchema>;
export type ShoppingItem = {
  id: string;
  ingredient: Ingredient;
  quantity: string;
  checked: boolean;
  price: string | null;
};

// A price is the whole row's cost, regardless of quantity. Sum integer cents
// so receipt totals stay exact, including totals beyond one money field's limit.
export function shoppingTotals(items: Pick<ShoppingItem, "checked" | "price">[]) {
  let cents = 0n;
  let missingPrices = 0;
  for (const item of items) {
    if (!item.checked) continue;
    if (item.price == null) missingPrices++;
    else cents += BigInt(item.price.replace(".", ""));
  }
  return {
    amount: `${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`,
    missingPrices,
  };
}
export type ShoppingList = {
  id: string;
  weekStart: string;
  status: "open" | "completed";
  completedAt: string | null;
  updatedAt: string;
  items: ShoppingItem[];
  transaction: { id: string; amount: string; date: string; categoryId: string } | null;
};
export type CurrentShoppingList = { data: ShoppingList | null; defaultCategoryId: string | null };
