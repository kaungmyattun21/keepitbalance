import type { Prisma, TransactionType } from "../../../../generated/prisma/client.ts";
import { prisma } from "../../../../shared/db.ts";

const categorySelect = { id: true, name: true, type: true, groupId: true } satisfies Prisma.CategorySelect;
const groupSelect = {
  id: true,
  name: true,
  type: true,
  categories: { select: categorySelect, orderBy: { name: "asc" } },
} satisfies Prisma.CategoryGroupSelect;

export function createDefaults(
  userId: string,
  groups: readonly { type: TransactionType; name: string; categories: readonly string[] }[],
) {
  return prisma.$transaction(async (tx) => {
    for (const entry of groups) {
      const group = await tx.categoryGroup.upsert({
        where: { userId_type_name: { userId, type: entry.type, name: entry.name } },
        create: { userId, type: entry.type, name: entry.name },
        update: {},
      });
      await tx.category.createMany({
        data: entry.categories.map((name) => ({ userId, type: entry.type, name, groupId: group.id })),
        skipDuplicates: true,
      });
    }
  });
}

export function findMany(userId: string, type?: TransactionType) {
  return prisma.category.findMany({
    where: { userId, type },
    select: categorySelect,
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

export function findGroups(userId: string, type?: TransactionType) {
  return prisma.categoryGroup.findMany({
    where: { userId, type },
    select: groupSelect,
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

export function findGroup(userId: string, id: string) {
  return prisma.categoryGroup.findFirst({ where: { id, userId }, select: groupSelect });
}

export function findCategory(userId: string, id: string) {
  return prisma.category.findFirst({ where: { id, userId }, select: categorySelect });
}

export function createGroup(userId: string, name: string, type: TransactionType) {
  return prisma.categoryGroup.create({ data: { userId, name, type }, select: groupSelect });
}

export function updateGroup(userId: string, id: string, name: string) {
  return prisma.categoryGroup.update({ where: { id, userId }, data: { name }, select: groupSelect });
}

export function deleteGroup(userId: string, id: string) {
  return prisma.categoryGroup.delete({ where: { id, userId } });
}

export function createCategory(userId: string, name: string, groupId: string, type: TransactionType) {
  return prisma.category.create({ data: { userId, name, groupId, type }, select: categorySelect });
}

export function updateCategory(userId: string, id: string, data: { name?: string; groupId?: string }) {
  return prisma.category.update({ where: { id, userId }, data, select: categorySelect });
}

export function deleteCategory(userId: string, id: string) {
  return prisma.category.delete({ where: { id, userId } });
}
