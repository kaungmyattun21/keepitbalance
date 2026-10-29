import type { Transaction } from "@keepitbalance/shared/finance";
import { fromDbDate } from "../../shared/calendar-date.ts";
import { toApiType } from "../../shared/transaction-type.ts";
import type { TransactionRow } from "./repository.ts";

export function toTransactionResponse(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: toApiType[row.type],
    amount: row.amount.toFixed(2),
    date: fromDbDate(row.date),
    note: row.note,
    category: { id: row.category.id, name: row.category.name, type: toApiType[row.category.type] },
    shoppingListId: row.shoppingListId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
