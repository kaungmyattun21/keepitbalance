import {
  listCategoriesQuerySchema,
  categoryParamsSchema,
  createCategoryGroupSchema,
  updateCategoryGroupSchema,
  createCategorySchema,
  updateCategorySchema,
} from "@keepitbalance/shared/finance";
import { Router } from "express";
import { requireAuth } from "../../../auth/index.ts";
import { validate } from "../../../../shared/middleware/validate.ts";
import * as controller from "./controller.ts";

export const categoryRoutes = Router();
categoryRoutes.use(requireAuth);
categoryRoutes.get("/", validate({ query: listCategoriesQuerySchema }), controller.listCategories);
categoryRoutes.post("/", validate({ body: createCategorySchema }), controller.createCategory);
categoryRoutes.patch(
  "/:id",
  validate({ params: categoryParamsSchema, body: updateCategorySchema }),
  controller.updateCategory,
);
categoryRoutes.delete("/:id", validate({ params: categoryParamsSchema }), controller.deleteCategory);

export const categoryGroupRoutes = Router();
categoryGroupRoutes.use(requireAuth);
categoryGroupRoutes.get("/", validate({ query: listCategoriesQuerySchema }), controller.listGroups);
categoryGroupRoutes.post("/", validate({ body: createCategoryGroupSchema }), controller.createGroup);
categoryGroupRoutes.patch(
  "/:id",
  validate({ params: categoryParamsSchema, body: updateCategoryGroupSchema }),
  controller.updateGroup,
);
categoryGroupRoutes.delete("/:id", validate({ params: categoryParamsSchema }), controller.deleteGroup);
