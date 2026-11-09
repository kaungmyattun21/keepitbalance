import { receiptDraftSchema, type Receipt } from "@keepitbalance/shared/receipts";
import type { Prisma } from "../../../../generated/prisma/client.ts";

export const receiptSelect = {
  id: true,
  status: true,
  draft: true,
  error: true,
  transactionId: true,
  createdAt: true,
  jobId: true,
  version: true,
} satisfies Prisma.ReceiptSelect;
export type ReceiptRow = Prisma.ReceiptGetPayload<{ select: typeof receiptSelect }>;

export function toReceiptResponse(row: ReceiptRow): Receipt {
  return {
    id: row.id,
    extractionVersion: row.version,
    status: row.status as Receipt["status"],
    draft: row.draft === null ? null : receiptDraftSchema.parse(row.draft),
    error: row.error,
    transactionId: row.transactionId,
    imageUrl: `/receipts/${row.id}/image`,
    createdAt: row.createdAt.toISOString(),
  };
}
