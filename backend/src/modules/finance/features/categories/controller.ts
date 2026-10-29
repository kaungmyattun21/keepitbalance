import type { ListCategoriesQuery } from "@keepitbalance/shared/finance";
import type { Request, Response } from "express";
import { getUserId } from "../../../auth/index.ts";
import * as service from "./service.ts";

export async function listCategories(req: Request, res: Response) {
  const categories = await service.listCategories(getUserId(req), req.query as ListCategoriesQuery);
  res.json({ data: categories });
}
