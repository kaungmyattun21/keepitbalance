import type {
  CreatePantryValues,
  UpdatePantryValues,
  AdjustPantryValues,
} from "@keepitbalance/shared/groceries";
import type { Request, Response } from "express";
import { getUserId } from "../../../auth/index.ts";
import * as service from "./service.ts";

export async function list(req: Request, res: Response) {
  const userId = getUserId(req);
  res.json({ data: await service.list(userId) });
}

export async function create(req: Request, res: Response) {
  const userId = getUserId(req);
  res.status(201).json(await service.create(userId, req.body as CreatePantryValues));
}

export async function update(req: Request, res: Response) {
  const userId = getUserId(req);
  const id = req.params.id as string;
  res.json(await service.update(userId, id, req.body as UpdatePantryValues));
}

export async function adjust(req: Request, res: Response) {
  const userId = getUserId(req);
  const id = req.params.id as string;
  res.json(await service.adjust(userId, id, req.body as AdjustPantryValues));
}

export async function remove(req: Request, res: Response) {
  const userId = getUserId(req);
  const id = req.params.id as string;
  await service.remove(userId, id);
  res.sendStatus(204);
}
