import { budgetsQuerySchema, replaceBudgetsSchema } from "@keepitbalance/shared/finance";
import { Router } from "express";
import { requireAuth } from "../../../auth/index.ts";
import { validate } from "../../../../shared/middleware/validate.ts";
import * as controller from "./controller.ts";

export const budgetRoutes = Router();

budgetRoutes.get("/", requireAuth, validate({ query: budgetsQuerySchema }), controller.getMonthlyBudgets);

budgetRoutes.put("/", requireAuth, validate({ body: replaceBudgetsSchema }), controller.replaceBudgets);
