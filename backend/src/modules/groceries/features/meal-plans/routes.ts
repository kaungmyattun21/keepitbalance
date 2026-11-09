import { Router } from "express";
import {
  mealSchema,
  updateMealSchema,
  mealEatenSchema,
  planningPeriodSchema,
  planningDateRangeSchema,
} from "@keepitbalance/shared/meal-planning";
import { groceryParamsSchema } from "@keepitbalance/shared/groceries";
import { requireAuth } from "../../../auth/index.ts";
import { validate } from "../../../../shared/middleware/validate.ts";
import * as controller from "./controller.ts";
export const mealPlanRoutes = Router();
mealPlanRoutes.use(requireAuth);
mealPlanRoutes.get("/preferences", controller.getPreferences);
mealPlanRoutes.put("/preferences", validate({ body: planningDateRangeSchema }), controller.savePreferences);
mealPlanRoutes.get("/", validate({ query: planningPeriodSchema }), controller.list);
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
