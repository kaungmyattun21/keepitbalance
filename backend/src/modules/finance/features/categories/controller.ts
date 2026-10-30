import type {
  ListCategoriesQuery,
  CreateCategoryGroupValues,
  UpdateCategoryGroupValues,
  CreateCategoryValues,
  UpdateCategoryValues,
} from "@keepitbalance/shared/finance";
import type { Request, Response } from "express";
import { getUserId } from "../../../auth/index.ts";
import * as service from "./service.ts";

export async function listCategories(req: Request, res: Response) {
  res.json({ data: await service.listCategories(getUserId(req), req.query as ListCategoriesQuery) });
}
export async function listGroups(req: Request, res: Response) {
  res.json({ data: await service.listGroups(getUserId(req), req.query as ListCategoriesQuery) });
}
export async function createGroup(req: Request, res: Response) {
  res.status(201).json(await service.createGroup(getUserId(req), req.body as CreateCategoryGroupValues));
}
export async function updateGroup(req: Request, res: Response) {
  res.json(
    await service.updateGroup(getUserId(req), req.params.id as string, req.body as UpdateCategoryGroupValues),
  );
}
export async function deleteGroup(req: Request, res: Response) {
  await service.deleteGroup(getUserId(req), req.params.id as string);
  res.sendStatus(204);
}
export async function createCategory(req: Request, res: Response) {
  res.status(201).json(await service.createCategory(getUserId(req), req.body as CreateCategoryValues));
}
export async function updateCategory(req: Request, res: Response) {
  res.json(
    await service.updateCategory(getUserId(req), req.params.id as string, req.body as UpdateCategoryValues),
  );
}
export async function deleteCategory(req: Request, res: Response) {
  await service.deleteCategory(getUserId(req), req.params.id as string);
  res.sendStatus(204);
}
