import type { CreateBillValues, UpdateBillValues, PayBillValues } from "@keepitbalance/shared/finance";
import type { Request, Response } from "express";
import { getUserId } from "../../../auth/index.ts";
import * as service from "./service.ts";

export async function listBills(req: Request, res: Response) {
  res.json({ data: await service.listBills(getUserId(req)) });
}

export async function createBill(req: Request, res: Response) {
  res.status(201).json(await service.createBill(getUserId(req), req.body as CreateBillValues));
}

export async function updateBill(req: Request, res: Response) {
  res.json(await service.updateBill(getUserId(req), req.params.id as string, req.body as UpdateBillValues));
}

export async function deleteBill(req: Request, res: Response) {
  await service.deleteBill(getUserId(req), req.params.id as string);
  res.sendStatus(204);
}

export async function payBill(req: Request, res: Response) {
  res
    .status(201)
    .json(await service.payBill(getUserId(req), req.params.id as string, req.body as PayBillValues));
}
