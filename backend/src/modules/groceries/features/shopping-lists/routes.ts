import {
  groceryParamsSchema,
  shoppingItemParamsSchema,
  createShoppingListSchema,
  shoppingListsQuerySchema,
  createShoppingItemSchema,
  createShoppingItemsBatchSchema,
  updateShoppingItemSchema,
  completeShoppingListSchema,
} from "@keepitbalance/shared/groceries";
import { Router } from "express";
import { requireAuth } from "../../../auth/index.ts";
import { validate } from "../../../../shared/middleware/validate.ts";
import * as controller from "./controller.ts";

export const shoppingListRoutes = Router();
shoppingListRoutes.use(requireAuth);
shoppingListRoutes.post(
  "/:id/items/batch",
  validate({ params: groceryParamsSchema, body: createShoppingItemsBatchSchema }),
  controller.addItems,
);
shoppingListRoutes.get("/", validate({ query: shoppingListsQuerySchema }), controller.list);
shoppingListRoutes.get("/current", controller.current);
shoppingListRoutes.post("/", validate({ body: createShoppingListSchema }), controller.create);
shoppingListRoutes.post(
  "/:id/items",
  validate({ params: groceryParamsSchema, body: createShoppingItemSchema }),
  controller.addItem,
);
shoppingListRoutes.patch(
  "/:id/items/:itemId",
  validate({ params: shoppingItemParamsSchema, body: updateShoppingItemSchema }),
  controller.updateItem,
);
shoppingListRoutes.delete(
  "/:id/items/:itemId",
  validate({ params: shoppingItemParamsSchema }),
  controller.removeItem,
);
shoppingListRoutes.post(
  "/:id/complete",
  validate({ params: groceryParamsSchema, body: completeShoppingListSchema }),
  controller.complete,
);
shoppingListRoutes.delete("/:id", validate({ params: groceryParamsSchema }), controller.remove);
