import type { Request, Response } from "express";
import type { RecipeValues, UpdateRecipeValues } from "@keepitbalance/shared/meal-planning";
import { getUserId } from "../../../auth/index.ts";
import * as service from "./service.ts";
export async function list(req: Request, res: Response) {
  res.json({ data: await service.list(getUserId(req)) });
}
export async function create(req: Request, res: Response) {
  res.status(201).json(await service.save(getUserId(req), req.body as RecipeValues));
}
export async function update(req: Request, res: Response) {
  res.json(await service.update(getUserId(req), req.params.id as string, req.body as UpdateRecipeValues));
}
export async function remove(req: Request, res: Response) {
  await service.remove(getUserId(req), req.params.id as string);
  res.sendStatus(204);
}

export async function image(req: Request, res: Response) {
  const photo = await service.image(getUserId(req), req.params.id as string);
  res.set("Cache-Control", "private, no-store");
  res.type(photo.contentType).send(Buffer.from(photo.data));
}
