import type { Block } from "tesseract.js";
import { describe, expect, it } from "vitest";
import { receiptTextFromLayout } from "./ocr-layout.ts";

describe("receipt layout", () => {
  it("rejoins amount columns with labels on the same row", () => {
    const block = (text: string, x: number, y: number) =>
      ({ paragraphs: [{ lines: [{ text, bbox: { x0: x, x1: x + 100, y0: y, y1: y + 20 } }] }] }) as Block;
    expect(
      receiptTextFromLayout({
        text: "TOTAL\nTAX\n100.00\n7.00",
        blocks: [
          block("100.00", 300, 100),
          block("7.00", 300, 150),
          block("TOTAL", 20, 100),
          block("TAX", 20, 150),
        ],
      }),
    ).toBe("TOTAL  100.00\nTAX  7.00");
  });
  it("preserves text when detailed layout is unavailable", () => {
    expect(receiptTextFromLayout({ text: "original text", blocks: null })).toBe("original text");
  });
});
