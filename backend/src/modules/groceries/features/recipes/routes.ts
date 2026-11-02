import { Router } from "express";
import { recipeSchema, updateRecipeSchema } from "@keepitbalance/shared/meal-planning";
import { groceryParamsSchema } from "@keepitbalance/shared/groceries";
import { requireAuth } from "../../../auth/index.ts";
import { validate } from "../../../../shared/middleware/validate.ts";
import * as controller from "./controller.ts";
export const recipeRoutes = Router();
recipeRoutes.use(requireAuth);
recipeRoutes.get("/", controller.list);
recipeRoutes.get("/:id/image", validate({ params: groceryParamsSchema }), controller.image);
recipeRoutes.post("/", validate({ body: recipeSchema }), controller.create);
recipeRoutes.put(
  "/:id",
  validate({ params: groceryParamsSchema, body: updateRecipeSchema }),
  controller.update,
);
recipeRoutes.delete("/:id", validate({ params: groceryParamsSchema }), controller.remove);
