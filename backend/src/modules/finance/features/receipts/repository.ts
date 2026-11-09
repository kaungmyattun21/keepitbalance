import { prisma } from "../../../../shared/db.ts";
import { receiptSelect } from "./receipt-response.ts";

export function findReceipt(userId: string, id: string) {
  return prisma.receipt.findFirst({ where: { id, userId }, select: { ...receiptSelect, rawText: true } });
}

export function listReceipts(userId: string, page: number, pageSize: number) {
  const where = { userId };
  return prisma.$transaction([
    prisma.receipt.findMany({
      where,
      select: receiptSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.receipt.count({ where }),
  ]);
}

export function findImage(userId: string, id: string) {
  return prisma.receiptImage.findFirst({
    where: { receiptId: id, receipt: { userId } },
    select: { contentType: true, data: true },
  });
}
