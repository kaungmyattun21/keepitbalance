import { Router } from "express";
import {
  mealSchema,
  updateMealSchema,
  mealEatenSchema,
  weekQuerySchema,
} from "@keepitbalance/shared/meal-planning";
import { groceryParamsSchema } from "@keepitbalance/shared/groceries";
import { requireAuth } from "../../../auth/index.ts";
import { validate } from "../../../../shared/middleware/validate.ts";
import * as controller from "./controller.ts";
export const mealPlanRoutes = Router();
mealPlanRoutes.use(requireAuth);
mealPlanRoutes.get("/", validate({ query: weekQuerySchema }), controller.list);
mealPlanRoutes.post("/", validate({ body: mealSchema }), controller.create);
mealPlanRoutes.put(
  "/:id",
  validate({ params: groceryParamsSchema, body: updateMealSchema }),
  controller.update,
);
mealPlanRoutes.patch(
  "/:id",
  validate({ params: groceryParamsSchema, body: mealEatenSchema }),
  controller.eaten,
);
mealPlanRoutes.delete("/:id", validate({ params: groceryParamsSchema }), controller.remove);
