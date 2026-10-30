import { conflict, notFound } from "../../../../shared/errors.ts";
import type { IngredientValues, IngredientsBatchValues } from "@keepitbalance/shared/groceries";
import { ingredientResponse } from "../../shared/response.ts";
import { groceryWrite } from "../../shared/write-error.ts";
import * as repository from "./repository.ts";

export async function list(userId: string) {
  return (await repository.findMany(userId)).map(ingredientResponse);
}
export async function create(userId: string, input: IngredientValues) {
  return ingredientResponse(await groceryWrite(() => repository.create(userId, input), "DUPLICATE_NAME"));
}
export async function update(userId: string, id: string, input: IngredientValues) {
  return ingredientResponse(
    await groceryWrite(
      () =>
        repository.withLockedIngredient(userId, id, async (tx, existing) => {
          if (!existing) throw notFound("Ingredient not found");
          if (existing.unit !== input.unit && Object.values(existing._count).some((count) => count > 0))
            throw conflict(
              "INGREDIENT_UNIT_IN_USE",
              "The unit cannot change while this ingredient is used by pantry, recipes or shopping lists.",
            );
          return repository.update(tx, userId, id, input);
        }),
      "DUPLICATE_NAME",
    ),
  );
}
export async function remove(userId: string, id: string) {
  await groceryWrite(() => repository.remove(userId, id));
}

export async function createBatch(userId: string, input: IngredientsBatchValues) {
  const existing = await repository.findExistingNames(
    userId,
    input.ingredients.map((ingredient) => ingredient.name),
  );
  if (existing.length)
    throw conflict(
      "DUPLICATE_NAME",
      `Already in your ingredient catalog: ${existing.map((ingredient) => ingredient.name).join(", ")}.`,
    );
  return (await groceryWrite(() => repository.createBatch(userId, input.ingredients), "DUPLICATE_NAME")).map(
    ingredientResponse,
  );
}
