import { RECEIPT_MAX_BYTES, type UploadReceipt } from "@keepitbalance/shared/receipts";
import sharp from "sharp";
import { badRequest } from "../../../../shared/errors.ts";

export const RECEIPT_MAX_PIXELS = 20_000_000;

export async function decodeReceiptImage(input: UploadReceipt) {
  const data = Buffer.from(input.data, "base64");
  if (!data.length || data.length > RECEIPT_MAX_BYTES) {
    throw badRequest("VALIDATION_ERROR", "Choose a receipt image up to 5 MB.");
  }
  try {
    const metadata = await sharp(data, { limitInputPixels: RECEIPT_MAX_PIXELS, animated: false }).metadata();
    const formats: Record<string, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
    if (formats[metadata.format ?? ""] !== input.contentType || (metadata.pages ?? 1) > 1) {
      throw new Error("Unsupported receipt image");
    }
    // Decode once before accepting: a valid header alone doesn't prove a readable image.
    await sharp(data, { limitInputPixels: RECEIPT_MAX_PIXELS }).resize({ width: 1 }).png().toBuffer();
    return data;
  } catch {
    throw badRequest("VALIDATION_ERROR", "Choose a readable JPEG, PNG, or WebP up to 20 megapixels.");
  }
}
