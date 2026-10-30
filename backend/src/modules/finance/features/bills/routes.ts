import {
  createBillSchema,
  updateBillSchema,
  payBillSchema,
  billParamsSchema,
} from "@keepitbalance/shared/finance";
import { Router } from "express";
import { requireAuth } from "../../../auth/index.ts";
import { validate } from "../../../../shared/middleware/validate.ts";
import * as controller from "./controller.ts";

export const billRoutes = Router();
billRoutes.use(requireAuth);
billRoutes.get("/", controller.listBills);
billRoutes.post("/", validate({ body: createBillSchema }), controller.createBill);
billRoutes.put("/:id", validate({ params: billParamsSchema, body: updateBillSchema }), controller.updateBill);
billRoutes.delete("/:id", validate({ params: billParamsSchema }), controller.deleteBill);
billRoutes.post(
  "/:id/payments",
  validate({ params: billParamsSchema, body: payBillSchema }),
  controller.payBill,
);
