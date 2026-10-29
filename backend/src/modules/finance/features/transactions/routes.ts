import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  transactionParamsSchema,
  updateTransactionSchema,
} from "@keepitbalance/shared/finance";
import { Router } from "express";
import { requireAuth } from "../../../auth/index.ts";
import { validate } from "../../../../shared/middleware/validate.ts";
import * as controller from "./controller.ts";

export const transactionRoutes = Router();

transactionRoutes.get(
  "/",
  requireAuth,
  validate({ query: listTransactionsQuerySchema }),
  controller.listTransactions,
);

transactionRoutes.post(
  "/",
  requireAuth,
  validate({ body: createTransactionSchema }),
  controller.createTransaction,
);

transactionRoutes.put(
  "/:id",
  requireAuth,
  validate({ params: transactionParamsSchema, body: updateTransactionSchema }),
  controller.updateTransaction,
);

transactionRoutes.delete(
  "/:id",
  requireAuth,
  validate({ params: transactionParamsSchema }),
  controller.deleteTransaction,
);
