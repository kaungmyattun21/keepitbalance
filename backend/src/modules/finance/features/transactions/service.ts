import type { Page } from "@keepitbalance/shared/api";
import { currentMonthIn } from "@keepitbalance/shared/dates";
import type {
  CreateTransactionValues,
  ListTransactionsQuery,
  Transaction,
  UpdateTransactionValues,
} from "@keepitbalance/shared/finance";
import type { TransactionType as DbTransactionType } from "../../../../generated/prisma/client.ts";
import { badRequest, conflict, notFound } from "../../../../shared/errors.ts";
import { monthDateRange, toDbDate } from "../../shared/calendar-date.ts";
import { toDbType } from "../../shared/transaction-type.ts";
import * as repository from "./repository.ts";
import { toTransactionResponse } from "./transaction-response.ts";

export async function createTransaction(
  userId: string,
  input: CreateTransactionValues,
): Promise<Transaction> {
  const type = toDbType[input.type];
  await requireMatchingCategory(userId, input.categoryId, type);

  const row = await repository.createTransaction({
    userId,
    categoryId: input.categoryId,
    type,
    amount: input.amount,
    date: toDbDate(input.date),
    note: input.note ?? null,
  });

  return toTransactionResponse(row);
}

export async function listTransactions(
  userId: string,
  timezone: string,
  query: ListTransactionsQuery,
): Promise<Page<Transaction>> {
  const month = query.month ?? currentMonthIn(timezone);
  const { from, before } = monthDateRange(month);

  const { rows, total } = await repository.findTransactionPage(
    { userId, type: query.type && toDbType[query.type], dateFrom: from, dateBefore: before },
    { page: query.page, pageSize: query.pageSize },
  );

  return {
    data: rows.map(toTransactionResponse),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.ceil(total / query.pageSize),
  };
}

export async function updateTransaction(
  userId: string,

  transactionId: string,
  input: UpdateTransactionValues,
): Promise<Transaction> {
  const existing = await repository.findTransaction(transactionId, userId);
  if (!existing) throw notFound("Transaction not found");

  const type = toDbType[input.type];
  const changesTypeOrCategory = existing.type !== type || existing.categoryId !== input.categoryId;
  if (existing.shoppingListId && changesTypeOrCategory) {
    throw conflict(
      "TRANSACTION_FROM_SHOPPING",
      "A shopping expense keeps its type and category. You can still change its amount, date and note.",
    );
  }

  await requireMatchingCategory(userId, input.categoryId, type);

  const row = await repository.updateTransaction(transactionId, userId, {
    categoryId: input.categoryId,
    type,
    amount: input.amount,
    date: toDbDate(input.date),
    note: input.note ?? null,
  });

  return toTransactionResponse(row);
}

export async function deleteTransaction(userId: string, transactionId: string): Promise<void> {
  const existing = await repository.findTransaction(transactionId, userId);
  if (!existing) throw notFound("Transaction not found");

  if (existing.shoppingListId) {
    throw conflict(
      "TRANSACTION_FROM_SHOPPING",
      "A shopping expense can't be deleted. Reopen the shopping list instead.",
    );
  }

  await repository.deleteTransaction(transactionId, userId);
}

async function requireMatchingCategory(userId: string, categoryId: string, type: DbTransactionType) {
  const category = await repository.findCategory(userId, categoryId);
  if (!category) throw notFound("Category not found");
  if (category.type !== type) {
    throw badRequest("CATEGORY_TYPE_MISMATCH", "The category's type must match the transaction's type");
  }
}
