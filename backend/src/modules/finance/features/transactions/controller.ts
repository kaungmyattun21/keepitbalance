import type {
  CategorySuggestionQuery,
  CreateTransactionValues,
  ListTransactionsQuery,
  TransactionParams,
  TransactionSummaryQuery,
  UpdateTransactionValues,
} from "@keepitbalance/shared/finance";
import type { Request, Response } from "express";
import { getUserId, getUserTimezone } from "../../../auth/index.ts";
import * as service from "./service.ts";

export async function createTransaction(req: Request, res: Response) {
  const transaction = await service.createTransaction(getUserId(req), req.body as CreateTransactionValues);
  res.status(201).json(transaction);
}

export async function listTransactions(req: Request, res: Response) {
  const transactionPage = await service.listTransactions(
    getUserId(req),
    getUserTimezone(req),
    req.query as unknown as ListTransactionsQuery,
  );
  res.json(transactionPage);
}

export async function suggestCategory(req: Request, res: Response) {
  const { note } = req.query as CategorySuggestionQuery;
  res.json({ data: await service.suggestCategory(getUserId(req), note) });
}

export async function getTransaction(req: Request, res: Response) {
  res.json(await service.getTransaction(getUserId(req), String(req.params.id)));
}

export async function summarizeTransactions(req: Request, res: Response) {
  const summary = await service.summarizeTransactions(
    getUserId(req),
    getUserTimezone(req),
    req.query as TransactionSummaryQuery,
  );
  res.json(summary);
}

export async function updateTransaction(req: Request, res: Response) {
  const { id } = req.params as TransactionParams;
  const transaction = await service.updateTransaction(
    getUserId(req),
    id,
    req.body as UpdateTransactionValues,
  );
  res.json(transaction);
}

export async function deleteTransaction(req: Request, res: Response) {
  const { id } = req.params as TransactionParams;
  await service.deleteTransaction(getUserId(req), id);
  res.status(204).end();
}
