import type { Request, Response } from "express";
import type { MealValues, UpdateMealValues, MealEatenValues } from "@keepitbalance/shared/meal-planning";
import { getUserId } from "../../../auth/index.ts";
import * as service from "./service.ts";
export async function list(req: Request, res: Response) {
  res.json({ data: await service.list(getUserId(req), req.query.weekStart as string) });
}
export async function create(req: Request, res: Response) {
  res.status(201).json(await service.create(getUserId(req), req.body as MealValues));
}
export async function update(req: Request, res: Response) {
  res.json(await service.update(getUserId(req), req.params.id as string, req.body as UpdateMealValues));
}
export async function eaten(req: Request, res: Response) {
  res.json(await service.update(getUserId(req), req.params.id as string, req.body as MealEatenValues));
}
export async function remove(req: Request, res: Response) {
  await service.remove(getUserId(req), req.params.id as string);
  res.sendStatus(204);
}
