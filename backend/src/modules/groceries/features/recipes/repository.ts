import type { Prisma } from "../../../../generated/prisma/client.ts";
import type { Recipe, RecipeValues } from "@keepitbalance/shared/meal-planning";
import { prisma } from "../../../../shared/db.ts";
import { ingredientInclude, ingredientResponse } from "../../shared/response.ts";

export const recipeInclude = {
  image: { select: { recipeId: true } },
  ingredients: { include: { ingredient: { include: ingredientInclude } }, orderBy: { ingredientId: "asc" } },
  _count: { select: { mealPlanEntries: true } },
} satisfies Prisma.RecipeInclude;
export type RecipeRow = Prisma.RecipeGetPayload<{ include: typeof recipeInclude }>;
export function response(row: RecipeRow): Recipe {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.image ? `/recipes/${row.id}/image?v=${row.updatedAt.getTime()}` : null,
    servings: row.servings,
    steps: row.steps,
    caloriesPerServing: row.caloriesPerServing,
    updatedAt: row.updatedAt.toISOString(),
    inUse: row._count.mealPlanEntries > 0,
    ingredients: row.ingredients.map((item) => ({
      ingredient: ingredientResponse(item.ingredient),
      quantity: item.quantity.toFixed(2),
    })),
  };
}
export function findMany(userId: string) {
  return prisma.recipe.findMany({
    where: { userId },
    include: recipeInclude,
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
}
export function find(tx: Prisma.TransactionClient, userId: string, id: string) {
  return tx.recipe.findFirst({ where: { id, userId }, include: recipeInclude });
}
export function ownedIngredients(tx: Prisma.TransactionClient, userId: string, ids: string[]) {
  return tx.ingredient.count({ where: { userId, id: { in: ids } } });
}
export function create(tx: Prisma.TransactionClient, userId: string, input: RecipeValues) {
  const { ingredients, image, ...data } = input;
  return tx.recipe.create({
    data: {
      ...data,
      userId,
      ingredients: { create: ingredients },
      ...(image && {
        image: { create: { contentType: image.contentType, data: Buffer.from(image.data, "base64") } },
      }),
    },
    include: recipeInclude,
  });
}
export function update(tx: Prisma.TransactionClient, row: RecipeRow, input: RecipeValues) {
  const { ingredients, image, ...data } = input;
  return tx.recipe.update({
    where: { id: row.id },
    data: {
      ...data,
      ...(image === null && row.image
        ? { image: { delete: true } }
        : image
          ? {
              image: {
                upsert: {
                  create: { contentType: image.contentType, data: Buffer.from(image.data, "base64") },
                  update: { contentType: image.contentType, data: Buffer.from(image.data, "base64") },
                },
              },
            }
          : {}),
      updatedAt: new Date(Math.max(Date.now(), row.updatedAt.getTime() + 1)),
      ingredients: { deleteMany: {}, create: ingredients },
    },
    include: recipeInclude,
  });
}
export function remove(tx: Prisma.TransactionClient, id: string) {
  return tx.recipe.delete({ where: { id } });
}

export function findImage(userId: string, id: string) {
  return prisma.recipeImage.findFirst({
    where: { recipeId: id, recipe: { userId } },
    select: { data: true, contentType: true },
  });
}
