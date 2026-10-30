import type {
  CreatePantryValues,
  UpdatePantryValues,
  AdjustPantryValues,
} from "@keepitbalance/shared/groceries";
import { badRequest, conflict, notFound } from "../../../../shared/errors.ts";
import { Prisma } from "../../../../generated/prisma/client.ts";
import { pantryResponse } from "../../shared/response.ts";
import { groceryWrite } from "../../shared/write-error.ts";
import * as repository from "./repository.ts";

export async function list(userId: string) {
  return (await repository.findMany(userId)).map(pantryResponse);
}
export async function create(userId: string, input: CreatePantryValues) {
  if (!(await repository.findIngredient(userId, input.ingredientId))) throw notFound("Ingredient not found");
  return pantryResponse(
    await groceryWrite(() => repository.create(userId, input.ingredientId, input.quantity)),
  );
}
export async function update(userId: string, id: string, input: UpdatePantryValues) {
  if (!(await repository.find(userId, id))) throw notFound("Pantry item not found");
  const result = await groceryWrite(() =>
    repository.update(userId, id, new Date(input.updatedAt), input.quantity),
  );
  if (!result)
    throw conflict(
      "RESOURCE_CHANGED",
      "Pantry stock changed. Close and reopen the form to use the latest quantity.",
    );
  return pantryResponse(result);
}
export async function adjust(userId: string, id: string, input: AdjustPantryValues) {
  const existing = await repository.find(userId, id);
  if (!existing) throw notFound("Pantry item not found");
  if (
    input.direction === "add" &&
    existing.quantity.plus(new Prisma.Decimal(input.quantity)).greaterThan("99999999.99")
  )
    throw badRequest("VALIDATION_ERROR", "The resulting quantity is too large.");
  const result = await groceryWrite(() => repository.adjust(userId, id, input.quantity, input.direction));
  if (!result)
    throw conflict(
      "INSUFFICIENT_STOCK",
      "There is not enough stock for that adjustment. Refresh and try again.",
    );
  return pantryResponse(result);
}
export async function remove(userId: string, id: string) {
  await groceryWrite(() => repository.remove(userId, id));
}
