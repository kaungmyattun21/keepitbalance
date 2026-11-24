import { Router } from "express";
import {
  confirmReceiptSchema,
  receiptParamsSchema,
  uploadReceiptSchema,
  listReceiptsQuerySchema,
} from "@keepitbalance/shared/receipts";
import { requireAuth } from "../../../auth/index.ts";
import { validate } from "../../../../shared/middleware/validate.ts";
import * as controller from "./controller.ts";

export const receiptRoutes = Router();
receiptRoutes.use(requireAuth);
receiptRoutes.get("/", validate({ query: listReceiptsQuerySchema }), controller.list);
receiptRoutes.post("/", validate({ body: uploadReceiptSchema }), controller.upload);
receiptRoutes.get("/:id", validate({ params: receiptParamsSchema }), controller.get);
receiptRoutes.get("/:id/image", validate({ params: receiptParamsSchema }), controller.image);
receiptRoutes.post("/:id/retry", validate({ params: receiptParamsSchema }), controller.retry);
receiptRoutes.post(
  "/:id/confirm",
  validate({ params: receiptParamsSchema, body: confirmReceiptSchema }),
  controller.confirm,
);
