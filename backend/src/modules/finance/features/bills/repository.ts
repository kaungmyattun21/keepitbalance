import type { Prisma } from "../../../../generated/prisma/client.ts";
import { prisma } from "../../../../shared/db.ts";

const billSelect = {
  id: true,
  userId: true,
  name: true,
  amount: true,
  frequency: true,
  recurrenceAnchor: true,
  nextDueDate: true,
  lastPaidDate: true,
  updatedAt: true,
  category: { select: { id: true, name: true, type: true, groupId: true } },
} satisfies Prisma.BillSelect;
export type BillRow = Prisma.BillGetPayload<{ select: typeof billSelect }>;

export function findMany(userId: string) {
  return prisma.bill.findMany({
    where: { userId },
    select: billSelect,
    orderBy: [{ nextDueDate: "asc" }, { name: "asc" }, { id: "asc" }],
  });
}

export function findBill(userId: string, id: string) {
  return prisma.bill.findFirst({ where: { userId, id }, select: billSelect });
}

export function findCategory(userId: string, id: string) {
  return prisma.category.findFirst({ where: { userId, id }, select: { id: true, type: true } });
}

export function createBill(data: Prisma.BillUncheckedCreateInput) {
  return prisma.bill.create({ data, select: billSelect });
}

export function updateBill(
  userId: string,
  id: string,
  version: Date,
  data: Prisma.BillUncheckedUpdateManyInput,
) {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.bill.updateMany({
      where: { userId, id, updatedAt: version },
      data: { ...data, updatedAt: new Date(Math.max(Date.now(), version.getTime() + 1)) },
    });
    if (!claimed.count) return null;
    return tx.bill.findUniqueOrThrow({ where: { id }, select: billSelect });
  });
}

export function deleteBill(userId: string, id: string) {
  return prisma.bill.deleteMany({ where: { userId, id } });
}

export function payBill(bill: BillRow, date: Date, amount: string, nextDueDate: Date) {
  return prisma.$transaction(async (tx) => {
    // Claim the exact occurrence and version before creating the expense. Concurrent clicks
    // wait on this row and fail the predicate once the first payment advances the schedule.
    const claimed = await tx.bill.updateMany({
      where: { id: bill.id, userId: bill.userId, nextDueDate: bill.nextDueDate, updatedAt: bill.updatedAt },
      data: {
        nextDueDate,
        lastPaidDate: date,
        // Versions must advance even when two changes fall within the same millisecond.
        updatedAt: new Date(Math.max(Date.now(), bill.updatedAt.getTime() + 1)),
      },
    });
    if (!claimed.count) return null;
    const transaction = await tx.transaction.create({
      data: {
        userId: bill.userId,
        categoryId: bill.category.id,
        type: "EXPENSE",
        amount,
        date,
        note: `Bill: ${bill.name} (due ${bill.nextDueDate.toISOString().slice(0, 10)})`,
      },
    });
    return {
      bill: await tx.bill.findUniqueOrThrow({ where: { id: bill.id }, select: billSelect }),
      transactionId: transaction.id,
    };
  });
}
