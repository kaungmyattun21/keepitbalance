import type { Request, Response } from "express";
import type { ApplyGenerationValues, PlanningPeriod } from "@keepitbalance/shared/meal-planning";
import { getUserId } from "../../../auth/index.ts";
import * as service from "./service.ts";
export async function preview(req: Request, res: Response) {
  res.json(await service.preview(getUserId(req), req.query as unknown as PlanningPeriod));
}
export async function apply(req: Request, res: Response) {
  res.json(await service.apply(getUserId(req), req.body as ApplyGenerationValues));
}
