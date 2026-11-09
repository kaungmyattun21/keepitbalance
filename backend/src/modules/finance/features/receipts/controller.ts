import type { Request, Response } from "express";
import type { ConfirmReceiptValues, UploadReceipt } from "@keepitbalance/shared/receipts";
import { getUserId } from "../../../auth/index.ts";
import * as service from "./service.ts";

export async function upload(req: Request, res: Response) {
  const { receipt, duplicate } = await service.uploadReceipt(getUserId(req), req.body as UploadReceipt);
  res
    .location(`/api/v1/receipts/${receipt.id}`)
    .status(duplicate ? 200 : 202)
    .json({ data: receipt, duplicate });
}
export async function list(req: Request, res: Response) {
  const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
  res.json(await service.listReceipts(getUserId(req), page, pageSize));
}
export async function get(req: Request, res: Response) {
  res.json({ data: await service.getReceipt(getUserId(req), String(req.params.id)) });
}
export async function retry(req: Request, res: Response) {
  res.status(202).json({ data: await service.retryReceipt(getUserId(req), String(req.params.id)) });
}
export async function confirm(req: Request, res: Response) {
  res.json({
    data: await service.confirmReceipt(
      getUserId(req),
      String(req.params.id),
      req.body as ConfirmReceiptValues,
    ),
  });
}
export async function image(req: Request, res: Response) {
  const photo = await service.getReceiptImage(getUserId(req), String(req.params.id));
  res
    .set({
      "Content-Type": photo.contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    })
    .send(Buffer.from(photo.data));
}
