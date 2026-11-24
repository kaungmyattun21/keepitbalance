import sharp from "sharp";
import { RECEIPT_MAX_PIXELS } from "./image.ts";

// Conservative paper detection: crop only a large connected light region on a
// contrasting background. Bright full-frame scans and small highlights stay intact.
export async function receiptPaperBounds(image: Uint8Array) {
  const { data, info } = await sharp(image, { limitInputPixels: RECEIPT_MAX_PIXELS })
    .resize({ width: 320, height: 640, fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let largest = { count: 0, left: 0, top: 0, right: width - 1, bottom: height - 1 };
  for (let seed = 0; seed < data.length; seed++) {
    if (visited[seed] || data[seed]! < 150) continue;
    let head = 0;
    let tail = 1;
    queue[0] = seed;
    visited[seed] = 1;
    let left = width,
      right = 0,
      top = height,
      bottom = 0;
    while (head < tail) {
      const index = queue[head++]!;
      const x = index % width;
      const y = Math.floor(index / width);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      const neighbors = [
        x > 0 ? index - 1 : -1,
        x + 1 < width ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y + 1 < height ? index + width : -1,
      ];
      for (const next of neighbors) {
        if (next < 0 || visited[next] || data[next]! < 150) continue;
        visited[next] = 1;
        queue[tail++] = next;
      }
    }
    if (tail > largest.count) largest = { count: tail, left, right, top, bottom };
  }
  const boxWidth = largest.right - largest.left + 1;
  const boxHeight = largest.bottom - largest.top + 1;
  const area = boxWidth * boxHeight;
  if (
    largest.count < width * height * 0.12 ||
    area > width * height * 0.92 ||
    largest.count / area < 0.5 ||
    boxWidth < width * 0.2 ||
    boxHeight < height * 0.35
  )
    return null;
  const metadata = await sharp(image).metadata();
  const scaleX = metadata.width! / width;
  const scaleY = metadata.height! / height;
  const padding = Math.ceil(Math.min(boxWidth * scaleX, boxHeight * scaleY) * 0.06);
  const left = Math.max(0, Math.floor(largest.left * scaleX) - padding);
  const top = Math.max(0, Math.floor(largest.top * scaleY) - padding);
  const right = Math.min(metadata.width!, Math.ceil((largest.right + 1) * scaleX) + padding);
  const bottom = Math.min(metadata.height!, Math.ceil((largest.bottom + 1) * scaleY) + padding);
  return { left, top, width: right - left, height: bottom - top };
}

export async function prepareReceiptImage(image: Uint8Array) {
  const oriented = await sharp(image, { limitInputPixels: RECEIPT_MAX_PIXELS })
    .rotate()
    .flatten({ background: "white" })
    .png()
    .toBuffer();
  const bounds = await receiptPaperBounds(oriented);
  const metadata = await sharp(oriented).metadata();
  // Tesseract needs legible glyph sizes. The previous withoutEnlargement setting
  // left phone-sized photos at their original tiny text size.
  const render = (pipeline: ReturnType<typeof sharp>, targetWidth: number) =>
    pipeline
      .resize({ width: Math.min(2000, targetWidth), height: 9600, fit: "inside" })
      .grayscale()
      .normalize()
      .png()
      .toBuffer();
  const full = await render(sharp(oriented), metadata.width! * 3);
  const cropped = bounds ? await render(sharp(oriented).extract(bounds), bounds.width * 4) : null;
  return { full, cropped };
}
