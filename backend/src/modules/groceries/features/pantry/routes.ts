import {
  groceryParamsSchema,
  createPantryItemSchema,
  updatePantryItemSchema,
  adjustPantryItemSchema,
} from "@keepitbalance/shared/groceries";
import { Router } from "express";
import { requireAuth } from "../../../auth/index.ts";
import { validate } from "../../../../shared/middleware/validate.ts";
import * as controller from "./controller.ts";

export const pantryRoutes = Router();
pantryRoutes.use(requireAuth);
pantryRoutes.get("/", controller.list);
pantryRoutes.post("/", validate({ body: createPantryItemSchema }), controller.create);
pantryRoutes.put(
  "/:id",
  validate({ params: groceryParamsSchema, body: updatePantryItemSchema }),
  controller.update,
);
pantryRoutes.post(
  "/:id/adjustments",
  validate({ params: groceryParamsSchema, body: adjustPantryItemSchema }),
  controller.adjust,
);
pantryRoutes.delete("/:id", validate({ params: groceryParamsSchema }), controller.remove);
