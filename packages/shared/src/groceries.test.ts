import { describe, expect, it } from "vitest";
import {
  createIngredientsBatchSchema,
  createShoppingItemsBatchSchema,
  quantitySchema,
  shoppingPriceFormSchema,
  shoppingTotals,
  positiveQuantitySchema,
  createIngredientSchema,
  createPantryItemSchema,
  createShoppingItemSchema,
  updateShoppingItemSchema,
  completeShoppingListSchema,
} from "./groceries.ts";
const id = "11111111-1111-4111-8111-111111111111";
describe("grocery validation", () => {
  it("normalizes decimal quantities and enforces database precision", () => {
    expect(quantitySchema.parse(" 0.1 ")).toBe("0.10");
    expect(quantitySchema.parse("99999999.99")).toBe("99999999.99");
    for (const value of ["-1", "1.234", "1e3", "100000000", "NaN", ""])
      expect(quantitySchema.safeParse(value).success).toBe(false);
  });
  it("allows zero pantry stock but requires positive purchase and adjustment quantities", () => {
    expect(createPantryItemSchema.safeParse({ ingredientId: id, quantity: "0" }).success).toBe(true);
    expect(createShoppingItemSchema.safeParse({ ingredientId: id, quantity: "0" }).success).toBe(false);
    expect(positiveQuantitySchema.safeParse("0.00").success).toBe(false);
  });
  it("validates ingredient units and trims names", () => {
    expect(createIngredientSchema.parse({ name: " Rice ", unit: "g" })).toEqual({ name: "Rice", unit: "g" });
    expect(createIngredientSchema.safeParse({ name: " ", unit: "g" }).success).toBe(false);
    expect(createIngredientSchema.safeParse({ name: "Rice", unit: "unknown" }).success).toBe(false);
  });
  it("requires item changes and a complete, versioned checkout", () => {
    expect(updateShoppingItemSchema.safeParse({}).success).toBe(false);
    expect(updateShoppingItemSchema.safeParse({ checked: false }).success).toBe(true);
    expect(
      completeShoppingListSchema.safeParse({ amount: "10", date: "2026-10-30", categoryId: id }).success,
    ).toBe(false);
    expect(
      completeShoppingListSchema.parse({
        amount: "10",
        date: "2026-10-30",
        categoryId: id,
        updatedAt: "2026-10-30T00:00:00.000Z",
      }).amount,
    ).toBe("10.00");
  });
});

describe("grocery batches", () => {
  it("requires one to fifty valid rows", () => {
    for (const items of [[], Array.from({ length: 51 }, () => ({ ingredientId: id, quantity: "1" }))])
      expect(createShoppingItemsBatchSchema.safeParse({ items }).success).toBe(false);
    expect(createIngredientsBatchSchema.safeParse({ ingredients: [] }).success).toBe(false);
  });
  it("rejects repeated normalized ingredient names on the offending row", () => {
    const parsed = createIngredientsBatchSchema.safeParse({
      ingredients: [
        { name: "Rice", unit: "g" },
        { name: " rice ", unit: "g" },
      ],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0]!.path).toEqual(["ingredients", 1, "name"]);
  });
  it("normalizes every item quantity and permits repeats to be combined by the server", () => {
    expect(
      createShoppingItemsBatchSchema
        .parse({
          items: [
            { ingredientId: id, quantity: "0.1" },
            { ingredientId: id, quantity: "0.2" },
          ],
        })
        .items.map((item) => item.quantity),
    ).toEqual(["0.10", "0.20"]);
  });
});

describe("shopping prices", () => {
  it("allows missing and free prices, normalizes amounts and rejects invalid prices", () => {
    expect(shoppingPriceFormSchema.parse({ price: "" })).toEqual({ price: null });
    expect(shoppingPriceFormSchema.parse({ price: " 0 " })).toEqual({ price: "0.00" });
    expect(updateShoppingItemSchema.parse({ price: "12.5" })).toEqual({ price: "12.50" });
    expect(updateShoppingItemSchema.parse({ price: null })).toEqual({ price: null });
    for (const price of ["-1", "1.001", "10000000000", "NaN", 2])
      expect(updateShoppingItemSchema.safeParse({ price }).success).toBe(false);
  });
  it("totals only purchased rows with exact decimal arithmetic and counts missing prices", () => {
    expect(
      shoppingTotals([
        { checked: true, price: "0.10" },
        { checked: true, price: "0.20" },
        { checked: true, price: "0.00" },
        { checked: true, price: null },
        { checked: false, price: "99.00" },
        { checked: false, price: null },
      ]),
    ).toEqual({ amount: "0.30", missingPrices: 1 });
    expect(shoppingTotals([])).toEqual({ amount: "0.00", missingPrices: 0 });
    expect(
      shoppingTotals(Array.from({ length: 10000 }, () => ({ checked: true, price: "9999999999.99" }))),
    ).toEqual({ amount: "99999999999900.00", missingPrices: 0 });
  });
});
