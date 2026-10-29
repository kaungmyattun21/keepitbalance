import { listCategoriesQuerySchema } from "@keepitbalance/shared/finance";
import { Router } from "express";
import { requireAuth } from "../../../auth/index.ts";
import { validate } from "../../../../shared/middleware/validate.ts";
import * as controller from "./controller.ts";

export const categoryRoutes = Router();

categoryRoutes.get(
  "/",
  requireAuth,
  validate({ query: listCategoriesQuerySchema }),
  controller.listCategories,
);
