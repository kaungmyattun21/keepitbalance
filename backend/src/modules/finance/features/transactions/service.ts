import type { Page } from "@keepitbalance/shared/api";
import { currentMonthIn } from "@keepitbalance/shared/dates";
import type {
  CategorySuggestion,
  CreateTransactionValues,
  ListTransactionsQuery,
  Transaction,
  TransactionSummary,
  TransactionSummaryQuery,
  UpdateTransactionValues,
} from "@keepitbalance/shared/finance";
import type { Prisma, TransactionType as DbTransactionType } from "../../../../generated/prisma/client.ts";
import { badRequest, conflict, notFound } from "../../../../shared/errors.ts";
import { monthDateRange, toDbDate } from "../../shared/calendar-date.ts";
import { toApiType, toDbType } from "../../shared/transaction-type.ts";
import * as repository from "./repository.ts";
import { toTransactionResponse } from "./transaction-response.ts";
import { toTransactionSummary } from "./transaction-summary.ts";

export async function createTransaction(
  userId: string,
  input: CreateTransactionValues,
): Promise<Transaction> {
  const type = toDbType[input.type];
  await requireMatchingCategory(userId, input.categoryId, type);

  const data = {
    userId,
    categoryId: input.categoryId,
    type,
    amount: input.amount,
    date: toDbDate(input.date),
    note: input.note ?? null,
  };
  const row = input.receiptId
    ? await repository.withTransaction(async (tx) => {
        const receipt = await repository.lockReceipt(tx, userId, input.receiptId!);
        if (!receipt) throw notFound("Receipt not found");
        // A retried submission of the same uploaded file returns its original transaction.
        if (receipt.transactionId) {
          const existing = await repository.findTransactionResponse(receipt.transactionId, userId, tx);
          if (!existing) throw notFound("Transaction not found");
          return existing;
        }
        const created = await repository.createTransaction(data, tx);
        await repository.attachReceipt(tx, receipt.id, created.id);
        return repository.findTransactionResponse(created.id, userId, tx).then((row) => row!);
      })
    : await repository.createTransaction(data);

  return toTransactionResponse(row);
}

export async function suggestCategory(userId: string, note: string): Promise<CategorySuggestion | null> {
  const row = await repository.findLatestCategoryForNote(userId, note);
  return row ? { categoryId: row.category.id, type: toApiType[row.category.type] } : null;
}

export async function getTransaction(userId: string, id: string): Promise<Transaction> {
  const row = await repository.findTransactionResponse(id, userId);
  if (!row) throw notFound("Transaction not found");
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

export async function summarizeTransactions(
  userId: string,
  timezone: string,
  query: TransactionSummaryQuery,
): Promise<TransactionSummary> {
  const month = query.month ?? currentMonthIn(timezone);
  const { from, before } = monthDateRange(month);

  const categorySums = await repository.sumAmountsByCategory(userId, from, before);
  const categories = await repository.findCategoryNames(
    userId,
    categorySums.map((row) => row.categoryId),
  );

  return toTransactionSummary({
    month,
    categorySums,
    categoryNames: new Map(categories.map((category) => [category.id, category.name])),
    categoryIcons: new Map(categories.map((category) => [category.id, category.icon])),
    typeFilter: query.type,
  });
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

  const data = {
    categoryId: input.categoryId,
    type,
    amount: input.amount,
    date: toDbDate(input.date),
    note: input.note ?? null,
  } satisfies Prisma.TransactionUncheckedUpdateInput;
  const row = input.receiptId
    ? await repository.withTransaction(async (tx) => {
        const current = await repository.lockTransaction(tx, userId, transactionId);
        if (!current) throw notFound("Transaction not found");
        if (current.receipt && current.receipt.id !== input.receiptId) {
          throw conflict("CONFLICT", "This transaction already has a receipt.");
        }
        const receipt = await repository.lockReceipt(tx, userId, input.receiptId!);
        if (!receipt) throw notFound("Receipt not found");
        if (receipt.transactionId && receipt.transactionId !== transactionId) {
          throw conflict("CONFLICT", "This receipt is already attached to another transaction.");
        }
        await repository.updateTransaction(transactionId, userId, data, tx);
        await repository.attachReceipt(tx, receipt.id, transactionId);
        return repository.findTransactionResponse(transactionId, userId, tx).then((row) => row!);
      })
    : await repository.updateTransaction(transactionId, userId, data);

  return toTransactionResponse(row);
}

export async function deleteTransaction(userId: string, transactionId: string): Promise<void> {
  const existing = await repository.findTransaction(transactionId, userId);
  if (!existing) throw notFound("Transaction not found");

  if (existing.receipt) {
    throw conflict(
      "CONFLICT",
      "A receipt purchase can't be deleted. You can edit its amount, date, note or category.",
    );
  }

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
