import { z } from "zod";
import { calendarDateSchema, moneySchema, uuidSchema } from "./schemas.ts";
import { createTransactionSchema } from "./finance.ts";

export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const receiptImageTypes = ["image/jpeg", "image/png", "image/webp"] as const;

export const uploadReceiptSchema = z.strictObject({
  contentType: z.enum(receiptImageTypes),
  data: z
    .string()
    .min(4)
    .max(4 * Math.ceil(RECEIPT_MAX_BYTES / 3))
    .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/, "Invalid image encoding."),
});
export const receiptParamsSchema = z.object({ id: uuidSchema });

export const receiptDraftSchema = z.object({
  merchant: z.string().nullable(),
  date: calendarDateSchema.nullable(),
  total: moneySchema.nullable(),
  warnings: z.array(z.string()),
});

export const confirmReceiptSchema = createTransactionSchema
  .omit({ type: true })
  .extend({ merchant: z.string().trim().max(200).optional() });

export type UploadReceipt = z.infer<typeof uploadReceiptSchema>;
export type ReceiptDraft = z.infer<typeof receiptDraftSchema>;
export type ConfirmReceiptInput = z.input<typeof confirmReceiptSchema>;
export type ConfirmReceiptValues = z.output<typeof confirmReceiptSchema>;

export type Receipt = {
  id: string;
  extractionVersion: number;
  status: "queued" | "processing" | "needs_review" | "failed" | "confirmed";
  draft: ReceiptDraft | null;
  error: string | null;
  transactionId: string | null;
  imageUrl: string;
  createdAt: string;
};

export type ReceiptDetail = Receipt & { rawText: string | null };
