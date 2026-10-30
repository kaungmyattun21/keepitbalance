import { Prisma } from "../../../generated/prisma/client.ts";
import { badRequest, conflict, notFound } from "../../../shared/errors.ts";

export async function groceryWrite<T>(
  action: () => Promise<T>,
  duplicate: "DUPLICATE_NAME" | "SHOPPING_LIST_EXISTS" | "CONFLICT" = "CONFLICT",
  inUse: "INGREDIENT_IN_USE" = "INGREDIENT_IN_USE",
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002")
        throw conflict(
          duplicate,
          duplicate === "SHOPPING_LIST_EXISTS"
            ? "You already have an open shopping list."
            : duplicate === "DUPLICATE_NAME"
              ? "An ingredient with that name already exists."
              : "This ingredient already has a pantry entry. Adjust its quantity instead.",
        );
      if (error.code === "P2003") throw conflict(inUse, "This ingredient is in use and cannot be deleted.");
      if (error.code === "P2025") throw notFound();
      if (error.code === "P2020")
        throw badRequest("VALIDATION_ERROR", "The resulting quantity is too large.");
    }
    throw error;
  }
}
