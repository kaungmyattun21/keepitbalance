import type { Bill, BillFrequency } from "@keepitbalance/shared/finance";
import { fromDbDate } from "../../shared/calendar-date.ts";
import { toApiType } from "../../shared/transaction-type.ts";
import type { BillRow } from "./repository.ts";

export function toBillResponse(row: BillRow): Bill {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount.toFixed(2),
    category: { ...row.category, type: toApiType[row.category.type] },
    frequency: row.frequency.toLowerCase() as BillFrequency,
    nextDueDate: fromDbDate(row.nextDueDate),
    lastPaidDate: row.lastPaidDate ? fromDbDate(row.lastPaidDate) : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}
