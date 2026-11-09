import type { JobWithMetadata } from "pg-boss";
import { prisma } from "../../../../shared/db.ts";
import { recognizeReceipt, type OcrProvider } from "./ocr-provider.ts";
import { getReceiptQueue, RECEIPT_QUEUE, type ReceiptJob } from "./queue.ts";
import { parseReceipt } from "./receipt-parser.ts";

export async function processReceipt(
  job: JobWithMetadata<ReceiptJob>,
  recognize: OcrProvider = recognizeReceipt,
) {
  const { receiptId, version } = job.data;
  const where = { id: receiptId, version, status: { in: ["queued", "processing"] } };
  const claimed = await prisma.receipt.updateMany({ where, data: { status: "processing", error: null } });
  if (!claimed.count) return;
  const started = Date.now();
  try {
    const image = await prisma.receiptImage.findUnique({ where: { receiptId }, select: { data: true } });
    if (!image) return; // Owner/receipt deletion cascades to the image.
    const result = await recognize(image.data, job.signal);
    const rawText = typeof result === "string" ? result : result.text;
    const draft = parseReceipt(rawText, typeof result === "string" ? undefined : result.confidence);
    await prisma.receipt.updateMany({ where, data: { rawText, draft, status: "needs_review", error: null } });
    console.info("Receipt extraction finished", {
      receiptId,
      jobId: job.id,
      attempt: job.retryCount + 1,
      durationMs: Date.now() - started,
    });
  } catch {
    const final = job.retryCount >= job.retryLimit;
    await prisma.receipt.updateMany({
      where,
      data: {
        status: final ? "failed" : "processing",
        error: final ? "We couldn't read this receipt. Retry or enter its details manually." : null,
      },
    });
    console.warn("Receipt extraction attempt failed", {
      receiptId,
      jobId: job.id,
      attempt: job.retryCount + 1,
    });
    // Throwing tells pg-boss to retry. Do not persist OCR text or image data in errors.
    throw new Error("Receipt extraction failed");
  }
}

export async function startReceiptWorker() {
  const boss = await getReceiptQueue();
  const options = { batchSize: 1, includeMetadata: true, pollingIntervalSeconds: 1 } as const;
  await boss.work<ReceiptJob, void, typeof options>(RECEIPT_QUEUE, options, async (jobs) => {
    for (const job of jobs) await processReceipt(job);
  });
}
