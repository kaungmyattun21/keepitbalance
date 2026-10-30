import { prisma } from "../../../../shared/db.ts";
import { pantryInclude } from "../../shared/response.ts";

export function findMany(userId: string) {
  return prisma.pantryItem.findMany({
    where: { userId },
    include: pantryInclude,
    orderBy: { ingredient: { name: "asc" } },
  });
}
export function findIngredient(userId: string, id: string) {
  return prisma.ingredient.findFirst({ where: { id, userId } });
}
export function create(userId: string, ingredientId: string, quantity: string) {
  return prisma.pantryItem.create({ data: { userId, ingredientId, quantity }, include: pantryInclude });
}
export function find(userId: string, id: string) {
  return prisma.pantryItem.findFirst({ where: { id, userId }, include: pantryInclude });
}
export function update(userId: string, id: string, version: Date, quantity: string) {
  return prisma.$transaction(async (tx) => {
    const result = await tx.pantryItem.updateMany({
      where: { userId, id, updatedAt: version },
      data: { quantity, updatedAt: new Date(Math.max(Date.now(), version.getTime() + 1)) },
    });
    return result.count ? tx.pantryItem.findUniqueOrThrow({ where: { id }, include: pantryInclude }) : null;
  });
}
export function adjust(userId: string, id: string, quantity: string, direction: "add" | "remove") {
  return prisma.$transaction(async (tx) => {
    const result = await tx.pantryItem.updateMany({
      where: { userId, id, quantity: direction === "remove" ? { gte: quantity } : undefined },
      data: { quantity: direction === "add" ? { increment: quantity } : { decrement: quantity } },
    });
    return result.count ? tx.pantryItem.findUniqueOrThrow({ where: { id }, include: pantryInclude }) : null;
  });
}
export function remove(userId: string, id: string) {
  return prisma.pantryItem.delete({ where: { userId, id } });
}
