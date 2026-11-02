import type { RecipeValues, UpdateRecipeValues } from "@keepitbalance/shared/meal-planning";
import { validateRecipeImage } from "./recipe-image.ts";
import { conflict, notFound } from "../../../../shared/errors.ts";
import { withGroceryWrite } from "../../shared/transaction.ts";
import { groceryWrite } from "../../shared/write-error.ts";
import * as repository from "./repository.ts";

export async function list(userId: string) {
  return (await repository.findMany(userId)).map(repository.response);
}
export function save(userId: string, input: RecipeValues, edit?: { id: string; updatedAt: string }) {
  if (input.image) validateRecipeImage(input.image);
  return groceryWrite(() =>
    withGroceryWrite(userId, async (tx) => {
      const ids = input.ingredients.map((item) => item.ingredientId);
      if ((await repository.ownedIngredients(tx, userId, ids)) !== ids.length)
        throw notFound("Ingredient not found");
      if (!edit) return repository.response(await repository.create(tx, userId, input));
      const current = await repository.find(tx, userId, edit.id);
      if (!current) throw notFound("Recipe not found");
      if (current.updatedAt.toISOString() !== edit.updatedAt)
        throw conflict("RESOURCE_CHANGED", "This recipe changed. Close and reopen it before saving.");
      return repository.response(await repository.update(tx, current, input));
    }),
  );
}
export function update(userId: string, id: string, input: UpdateRecipeValues) {
  const { updatedAt, ...values } = input;
  return save(userId, values, { id, updatedAt });
}
export async function remove(userId: string, id: string) {
  await withGroceryWrite(userId, async (tx) => {
    const current = await repository.find(tx, userId, id);
    if (!current) throw notFound("Recipe not found");
    if (current._count.mealPlanEntries)
      throw conflict(
        "RECIPE_IN_USE",
        "This recipe is used in your meal plan. Remove those meals before deleting it.",
      );
    await repository.remove(tx, id);
  });
}

export async function image(userId: string, id: string) {
  const photo = await repository.findImage(userId, id);
  if (!photo) throw notFound("Recipe image not found");
  return photo;
}
