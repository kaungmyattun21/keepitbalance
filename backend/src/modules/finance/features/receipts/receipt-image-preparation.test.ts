import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { prepareReceiptImage, receiptPaperBounds } from "./receipt-image-preparation.ts";

describe("receipt image preparation", () => {
  it("finds a bright receipt against a dark background and enlarges small text", async () => {
    const paper = await sharp({ create: { width: 180, height: 550, channels: 3, background: "#dddddd" } })
      .png()
      .toBuffer();
    const image = await sharp({ create: { width: 480, height: 640, channels: 3, background: "#202020" } })
      .composite([{ input: paper, left: 120, top: 40 }])
      .png()
      .toBuffer();
    const bounds = await receiptPaperBounds(image);
    expect(bounds).not.toBeNull();
    expect(bounds!.left).toBeLessThanOrEqual(120);
    expect(bounds!.left + bounds!.width).toBeGreaterThanOrEqual(300);
    expect(bounds!.width).toBeLessThan(240);
    const prepared = await prepareReceiptImage(image);
    const metadata = await sharp(prepared.cropped!).metadata();
    expect(metadata.width).toBeGreaterThan(700);
    expect(metadata.height).toBeGreaterThan(2000);
    expect(prepared.full).not.toEqual(prepared.cropped);
  });
  it("keeps full-frame scans and dark images intact", async () => {
    for (const background of ["white", "#202020"]) {
      const image = await sharp({ create: { width: 300, height: 600, channels: 3, background } })
        .png()
        .toBuffer();
      expect(await receiptPaperBounds(image)).toBeNull();
    }
  });
});
