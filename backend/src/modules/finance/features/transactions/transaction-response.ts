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
    category: {
      groupId: row.category.groupId,
      id: row.category.id,
      name: row.category.name,
      icon: row.category.icon,
      type: toApiType[row.category.type],
    },
    shoppingListId: row.shoppingListId,
    receipt: row.receipt ? { id: row.receipt.id, imageUrl: `/receipts/${row.receipt.id}/image` } : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
