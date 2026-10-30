import {
  groceryParamsSchema,
  createIngredientSchema,
  createIngredientsBatchSchema,
  updateIngredientSchema,
} from "@keepitbalance/shared/groceries";
import { Router } from "express";
import { requireAuth } from "../../../auth/index.ts";
import { validate } from "../../../../shared/middleware/validate.ts";
import * as controller from "./controller.ts";

export const ingredientRoutes = Router();
ingredientRoutes.use(requireAuth);
ingredientRoutes.post("/batch", validate({ body: createIngredientsBatchSchema }), controller.createBatch);
ingredientRoutes.get("/", controller.list);
ingredientRoutes.post("/", validate({ body: createIngredientSchema }), controller.create);
ingredientRoutes.put(
  "/:id",
  validate({ params: groceryParamsSchema, body: updateIngredientSchema }),
  controller.update,
);
ingredientRoutes.delete("/:id", validate({ params: groceryParamsSchema }), controller.remove);
