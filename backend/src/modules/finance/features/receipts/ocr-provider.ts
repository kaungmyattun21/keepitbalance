import { createRequire } from "node:module";
import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWorker, PSM } from "tesseract.js";
import sharp from "sharp";
import { receiptTextFromLayout } from "./ocr-layout.ts";
import { prepareReceiptImage } from "./receipt-image-preparation.ts";
import { combineReadings } from "./ocr-reading.ts";
import { parseReceipt } from "./receipt-parser.ts";

export type OcrResult = { text: string; confidence: number };
export type OcrProvider = (image: Uint8Array, signal?: AbortSignal) => Promise<string | OcrResult>;
const require = createRequire(import.meta.url);

export const recognizeReceipt: OcrProvider = async (image, signal) => {
  const langDirectory = await mkdtemp(join(tmpdir(), "keepitbalance-ocr-"));
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  let expired = false;
  let rejectStopped: (error: Error) => void = () => {};
  const stopped = new Promise<never>((_resolve, reject) => {
    rejectStopped = reject;
  });
  const stop = () => {
    expired = true;
    rejectStopped(new Error("OCR interrupted or timed out"));
  };
  const timeout = setTimeout(stop, 120_000);
  signal?.addEventListener("abort", stop, { once: true });
  if (signal?.aborted) stop();
  try {
    return await Promise.race([
      (async () => {
        const prepared = await prepareReceiptImage(image);
        if (expired) throw new Error("OCR interrupted");
        // Both models must be in one directory. Use names rather than Lang objects:
        // Tesseract.js 7 initializes object languages using their data instead of code.
        await Promise.all(
          ["eng", "tha"].map(async (code) => {
            const { langPath } = require(`@tesseract.js-data/${code}`) as { langPath: string };
            await copyFile(
              join(langPath, `${code}.traineddata.gz`),
              join(langDirectory, `${code}.traineddata.gz`),
            );
          }),
        );
        if (expired) throw new Error("OCR interrupted");
        worker = await createWorker("eng+tha", 1, {
          langPath: langDirectory,
          cacheMethod: "none",
          gzip: true,
          workerPath: require.resolve("tesseract.js/src/worker-script/node/index.js"),
          errorHandler: () => {},
        });
        if (expired) {
          await worker.terminate();
          throw new Error("OCR interrupted");
        }
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
          preserve_interword_spaces: "1",
          user_defined_dpi: "300",
        });
        const read = async (input: Buffer): Promise<OcrResult> => {
          if (expired) throw new Error("OCR interrupted");
          const { data } = await worker!.recognize(input, {}, { text: true, blocks: true });
          return { text: receiptTextFromLayout(data).slice(0, 40_000), confidence: data.confidence };
        };
        const readings = [await read(prepared.full)];
        if (prepared.cropped) readings.push(await read(prepared.cropped));
        if (readings[0]!.text.replace(/\s/g, "").length < 150 || readings[0]!.confidence < 60) {
          await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
          readings.push(await read(prepared.full));
        }
        const primary = combineReadings(readings);
        if (parseReceipt(primary.text).total) return primary;

        // Small overlapping bands prevent a logo, stamp or QR code from making
        // the page detector ignore the payment area. Keep the whole reading too.
        const bandImage = prepared.cropped ?? prepared.full;
        const { width, height } = await sharp(bandImage).metadata();
        const supplements: string[] = [];
        await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
        for (const fraction of [0.45, 0.62, 0.79]) {
          const top = Math.floor(height! * fraction);
          const band = await sharp(bandImage)
            .extract({
              left: 0,
              top,
              width: width!,
              height: Math.min(Math.ceil(height! * 0.23), height! - top),
            })
            .png()
            .toBuffer();
          const reading = await read(band);
          if (/\b(?:TOTAL|OTAL|OTA|VAT|CASH|ASH|THB)\b|ยอด|จำนวนเงิน/i.test(reading.text))
            supplements.push(reading.text);
        }
        return { ...primary, text: [primary.text, ...supplements].join("\n\n").slice(0, 40_000) };
      })(),
      stopped,
    ]);
  } finally {
    expired = true;
    clearTimeout(timeout);
    signal?.removeEventListener("abort", stop);
    try {
      if (worker) await worker.terminate();
    } finally {
      await rm(langDirectory, { recursive: true, force: true });
    }
  }
};
