import { expect, it } from "vitest";
import { requiredQuantities } from "./calculation.ts";
it("scales recipe requirements using exact fractions and rounds upward only after summing", () => {
  expect(
    requiredQuantities([
      { ingredientId: "rice", quantity: "300.00", recipeServings: 2, plannedServings: 3 },
    ]).get("rice"),
  ).toBe("450.00");
  expect(
    requiredQuantities(
      Array.from({ length: 3 }, () => ({
        ingredientId: "rice",
        quantity: "0.01",
        recipeServings: 3,
        plannedServings: 1,
      })),
    ).get("rice"),
  ).toBe("0.01");
  expect(
    requiredQuantities([
      { ingredientId: "rice", quantity: "1.00", recipeServings: 3, plannedServings: 1 },
    ]).get("rice"),
  ).toBe("0.34");
});
it("rejects requirements beyond the supported database quantity", () => {
  expect(() =>
    requiredQuantities([
      { ingredientId: "rice", quantity: "99999999.99", recipeServings: 1, plannedServings: 1000 },
    ]),
  ).toThrow(RangeError);
});
