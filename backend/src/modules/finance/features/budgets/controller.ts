import type { BudgetsQuery, ReplaceBudgetsValues } from "@keepitbalance/shared/finance";
import type { Request, Response } from "express";
import { getUserId, getUserTimezone } from "../../../auth/index.ts";
import * as service from "./service.ts";

export async function getMonthlyBudgets(req: Request, res: Response) {
  const monthlyBudgets = await service.getMonthlyBudgets(
    getUserId(req),
    getUserTimezone(req),
    req.query as BudgetsQuery,
  );
  res.json(monthlyBudgets);
}

export async function replaceBudgets(req: Request, res: Response) {
  const monthlyBudgets = await service.replaceBudgets(
    getUserId(req),
    getUserTimezone(req),
    req.body as ReplaceBudgetsValues,
  );
  res.json(monthlyBudgets);
}
