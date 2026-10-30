import type {
  ShoppingItemValues,
  ShoppingItemsBatchValues,
  UpdateShoppingItemValues,
  CompleteShoppingValues,
  ShoppingListsQuery,
} from "@keepitbalance/shared/groceries";
import type { Request, Response } from "express";
import { getUserId, getUserTimezone } from "../../../auth/index.ts";
import * as service from "./service.ts";

export async function list(req: Request, res: Response) {
  const userId = getUserId(req);
  res.json({ data: await service.list(userId, req.query as ShoppingListsQuery) });
}

export async function current(req: Request, res: Response) {
  const userId = getUserId(req);
  res.json(await service.current(userId));
}

export async function create(req: Request, res: Response) {
  const userId = getUserId(req);
  res.status(201).json(await service.create(userId, getUserTimezone(req), req.body.weekStart));
}

export async function addItem(req: Request, res: Response) {
  const userId = getUserId(req);
  const id = req.params.id as string;
  res.status(201).json(await service.addItem(userId, id, req.body as ShoppingItemValues));
}

export async function updateItem(req: Request, res: Response) {
  const userId = getUserId(req);
  const id = req.params.id as string;
  res.json(
    await service.updateItem(userId, id, req.params.itemId as string, req.body as UpdateShoppingItemValues),
  );
}

export async function removeItem(req: Request, res: Response) {
  const userId = getUserId(req);
  const id = req.params.id as string;
  res.json(await service.removeItem(userId, id, req.params.itemId as string));
}

export async function remove(req: Request, res: Response) {
  const userId = getUserId(req);
  const id = req.params.id as string;
  await service.remove(userId, id);
  res.sendStatus(204);
}

export async function complete(req: Request, res: Response) {
  const userId = getUserId(req);
  const id = req.params.id as string;
  res.json(await service.complete(userId, id, req.body as CompleteShoppingValues));
}

export async function addItems(req: Request, res: Response) {
  res
    .status(201)
    .json(
      await service.addItems(getUserId(req), req.params.id as string, req.body as ShoppingItemsBatchValues),
    );
}
