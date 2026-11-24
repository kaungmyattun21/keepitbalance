import { describe, expect, it } from "vitest";
import { bestReading, combineReadings } from "./ocr-reading.ts";
import { parseReceipt } from "./receipt-parser.ts";

describe("OCR reading selection", () => {
  it("prefers receipt coverage to a few high-confidence words", () => {
    const fragment = { text: "LT DISNEY\n8052909701\nrn", confidence: 95 };
    const complete = {
      text:
        "Shop\n2025-06-22\n" +
        "Product 39.00\n".repeat(15) +
        "TOTAL 509.00\nVAT 33.30\nCASH 1000.00\nCHANGE 491.00",
      confidence: 73,
    };
    expect(bestReading([fragment, complete])).toBe(complete);
  });
  it("preserves contradictory totals rather than hiding them behind a winning confidence score", () => {
    const result = combineReadings([
      { text: "Shop\nTOTAL 509.00", confidence: 85 },
      { text: "Shop\nTOTAL 508.00", confidence: 70 },
    ]);
    expect(parseReceipt(result.text).total).toBeNull();
  });
});
