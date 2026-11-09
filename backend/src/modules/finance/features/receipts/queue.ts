import { fromPrisma } from "pg-boss";
import type { Prisma } from "../../../../generated/prisma/client.ts";
import { getJobs } from "../../../../shared/jobs.ts";

export const RECEIPT_QUEUE = "receipt-extraction";
export type ReceiptJob = { receiptId: string; version: number };

let ready: Promise<void> | undefined;
export async function getReceiptQueue() {
  const boss = await getJobs();
  ready ??= boss
    .createQueue(RECEIPT_QUEUE, {
      retryLimit: 2,
      retryDelay: 5,
      retryBackoff: true,
      expireInSeconds: 180,
      heartbeatSeconds: 30,
      // Keep unfinished jobs during a long worker outage. Completed history is expendable.
      retentionSeconds: 365 * 24 * 60 * 60,
      deleteAfterSeconds: 7 * 24 * 60 * 60,
    })
    .catch((error: unknown) => {
      ready = undefined;
      throw error;
    });
  await ready;
  return boss;
}

export async function scheduleExtraction(tx: Prisma.TransactionClient, data: ReceiptJob) {
  const boss = await getReceiptQueue();
  // The receipt and queue instruction commit together using this Prisma transaction.
  const jobId = await boss.send(RECEIPT_QUEUE, data, { db: fromPrisma(tx) });
  if (!jobId) throw new Error("Failed to schedule receipt extraction");
  await tx.receipt.update({ where: { id: data.receiptId }, data: { jobId } });
}
