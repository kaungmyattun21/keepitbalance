import type { Prisma } from "../../../../generated/prisma/client.ts";
import { prisma } from "../../../../shared/db.ts";

const budgetSelect = {
  id: true,
  amount: true,
  category: { select: { id: true, name: true, type: true } },
} satisfies Prisma.BudgetSelect;

export type BudgetRow = Prisma.BudgetGetPayload<{ select: typeof budgetSelect }>;

export function findBudgets(userId: string): Promise<BudgetRow[]> {
  return prisma.budget.findMany({
    where: { userId },
    select: budgetSelect,
    orderBy: { category: { name: "asc" } },
  });
}

export function sumExpensesByCategory(
  userId: string,
  categoryIds: string[],
  dateFrom: Date,
  dateBefore: Date,
) {
  return prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      type: "EXPENSE",
      categoryId: { in: categoryIds },
      date: { gte: dateFrom, lt: dateBefore },
    },
    _sum: { amount: true },
  });
}

export type CategorySpendingRow = Awaited<ReturnType<typeof sumExpensesByCategory>>[number];

export function findCategories(userId: string, categoryIds: string[]) {
  return prisma.category.findMany({
    where: { userId, id: { in: categoryIds } },
    select: { id: true, type: true },
  });
}

export type BudgetEntry = { categoryId: string; amount: string };

// One database transaction: the set is either fully replaced or left untouched.
export async function replaceBudgets(userId: string, entries: BudgetEntry[]): Promise<void> {
  await prisma.$transaction([
    prisma.budget.deleteMany({
      where: { userId, categoryId: { notIn: entries.map((entry) => entry.categoryId) } },
    }),
    ...entries.map((entry) =>
      prisma.budget.upsert({
        where: { userId_categoryId: { userId, categoryId: entry.categoryId } },
        create: { userId, categoryId: entry.categoryId, amount: entry.amount },
        update: { amount: entry.amount },
      }),
    ),
  ]);
}
