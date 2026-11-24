import type { OcrResult } from "./ocr-provider.ts";
import { parseReceipt } from "./receipt-parser.ts";

export function readingScore(reading: OcrResult) {
  const characters = reading.text.replace(/[^\p{L}\p{N}]/gu, "").length;
  const prices = [...reading.text.matchAll(/\d+[.,]\d{2}\b/g)].length;
  // A high-confidence word is not a high-quality reading of an entire receipt.
  const draft = parseReceipt(reading.text);
  return (
    (draft.date ? 25 : 0) +
    (draft.total ? 30 : 0) +
    reading.confidence * Math.min(1, characters / 300) +
    Math.min(characters, 3000) / 25 +
    Math.min(prices, 20) * 3
  );
}

export function bestReading(readings: OcrResult[]) {
  return readings.reduce((best, reading) => (readingScore(reading) > readingScore(best) ? reading : best));
}

export function combineReadings(readings: OcrResult[]): OcrResult {
  const primary = bestReading(readings);
  const draft = parseReceipt(primary.text);
  const conflicts = readings.filter((reading) => {
    if (reading === primary) return false;
    const other = parseReceipt(reading.text);
    return (
      (draft.total && other.total && draft.total !== other.total) ||
      (draft.date && other.date && draft.date !== other.date)
    );
  });
  return { ...primary, text: [primary.text, ...conflicts.map((reading) => reading.text)].join("\n\n") };
}
