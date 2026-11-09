import { createRequire } from "node:module";
import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWorker, PSM } from "tesseract.js";
import sharp from "sharp";
import { RECEIPT_MAX_PIXELS } from "./image.ts";
import { receiptTextFromLayout } from "./ocr-layout.ts";

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
        const prepared = await sharp(image, { limitInputPixels: RECEIPT_MAX_PIXELS })
          .rotate()
          .flatten({ background: "white" })
          .resize({ width: 2000, height: 8000, fit: "inside", withoutEnlargement: true })
          .grayscale()
          .normalize()
          .sharpen()
          .png()
          .toBuffer();
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
          tessedit_pageseg_mode: PSM.AUTO,
          preserve_interword_spaces: "1",
          user_defined_dpi: "300",
        });
        const result = await worker.recognize(prepared, { rotateAuto: true }, { text: true, blocks: true });
        return {
          text: receiptTextFromLayout(result.data).slice(0, 40_000),
          confidence: result.data.confidence,
        };
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
