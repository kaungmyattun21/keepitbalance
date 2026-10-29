import type { Prisma, TransactionType } from "../../../../generated/prisma/client.ts";
import { prisma } from "../../../../shared/db.ts";

const transactionSelect = {
  id: true,
  type: true,
  amount: true,
  date: true,
  note: true,
  shoppingListId: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, type: true } },
} satisfies Prisma.TransactionSelect;

export type TransactionRow = Prisma.TransactionGetPayload<{ select: typeof transactionSelect }>;

export type TransactionFilters = {
  userId: string;
  type?: TransactionType;
  dateFrom: Date;
  dateBefore: Date;
};

export type PageRequest = { page: number; pageSize: number };

export function findCategory(userId: string, categoryId: string) {
  return prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true, type: true },
  });
}

export function createTransaction(data: Prisma.TransactionUncheckedCreateInput): Promise<TransactionRow> {
  return prisma.transaction.create({ data, select: transactionSelect });
}

export async function findTransactionPage(
  filters: TransactionFilters,
  { page, pageSize }: PageRequest,
): Promise<{ rows: TransactionRow[]; total: number }> {
  const where = {
    userId: filters.userId,
    type: filters.type,
    date: { gte: filters.dateFrom, lt: filters.dateBefore },
  } satisfies Prisma.TransactionWhereInput;

  const [rows, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      select: transactionSelect,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
  ]);

  return { rows, total };
}

export function findTransaction(id: string, userId: string) {
  return prisma.transaction.findFirst({
    where: { id, userId },
    select: { id: true, type: true, categoryId: true, shoppingListId: true },
  });
}

export function updateTransaction(
  id: string,
  userId: string,
  data: Prisma.TransactionUncheckedUpdateInput,
): Promise<TransactionRow> {
  return prisma.transaction.update({ where: { id, userId }, data, select: transactionSelect });
}

export async function deleteTransaction(id: string, userId: string): Promise<void> {
  await prisma.transaction.delete({ where: { id, userId } });
}

export function sumAmountsByCategory(userId: string, dateFrom: Date, dateBefore: Date) {
  return prisma.transaction.groupBy({
    by: ["categoryId", "type"],
    where: { userId, date: { gte: dateFrom, lt: dateBefore } },
    _sum: { amount: true },
  });
}

export type CategorySumRow = Awaited<ReturnType<typeof sumAmountsByCategory>>[number];

export function findCategoryNames(userId: string, categoryIds: string[]) {
  return prisma.category.findMany({
    where: { userId, id: { in: categoryIds } },
    select: { id: true, name: true },
  });
}
