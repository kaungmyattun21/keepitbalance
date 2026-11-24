import type { Prisma, TransactionType } from "../../../../generated/prisma/client.ts";
import { prisma } from "../../../../shared/db.ts";

const transactionSelect = {
  id: true,
  type: true,
  amount: true,
  date: true,
  note: true,
  shoppingListId: true,
  receipt: { select: { id: true } },
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, type: true, groupId: true, icon: true } },
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

export function createTransaction(
  data: Prisma.TransactionUncheckedCreateInput,
  tx: Prisma.TransactionClient = prisma,
): Promise<TransactionRow> {
  return tx.transaction.create({ data, select: transactionSelect });
}

export function withTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(work);
}

export async function lockReceipt(tx: Prisma.TransactionClient, userId: string, id: string) {
  await tx.$queryRaw`SELECT id FROM receipts WHERE id = ${id}::uuid AND user_id = ${userId}::uuid FOR UPDATE`;
  return tx.receipt.findFirst({ where: { id, userId }, select: { id: true, transactionId: true } });
}

export async function lockTransaction(tx: Prisma.TransactionClient, userId: string, id: string) {
  await tx.$queryRaw`SELECT id FROM transactions WHERE id = ${id}::uuid AND user_id = ${userId}::uuid FOR UPDATE`;
  return findTransaction(id, userId, tx);
}

export function attachReceipt(tx: Prisma.TransactionClient, receiptId: string, transactionId: string) {
  return tx.receipt.update({
    where: { id: receiptId },
    data: { transactionId, status: "confirmed", error: null },
  });
}

export function findTransactionResponse(id: string, userId: string, tx: Prisma.TransactionClient = prisma) {
  return tx.transaction.findFirst({ where: { id, userId }, select: transactionSelect });
}

export function findLatestCategoryForNote(userId: string, note: string) {
  return prisma.transaction.findFirst({
    where: { userId, note: { equals: note, mode: "insensitive" } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    select: { category: { select: { id: true, type: true } } },
  });
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

export function findTransaction(id: string, userId: string, tx: Prisma.TransactionClient = prisma) {
  return tx.transaction.findFirst({
    where: { id, userId },
    select: {
      id: true,
      type: true,
      categoryId: true,
      shoppingListId: true,
      receipt: { select: { id: true } },
    },
  });
}

export function updateTransaction(
  id: string,
  userId: string,
  data: Prisma.TransactionUncheckedUpdateInput,
  tx: Prisma.TransactionClient = prisma,
): Promise<TransactionRow> {
  return tx.transaction.update({ where: { id, userId }, data, select: transactionSelect });
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
    select: { id: true, name: true, icon: true },
  });
}
