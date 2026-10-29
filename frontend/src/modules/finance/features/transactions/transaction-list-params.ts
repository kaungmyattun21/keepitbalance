import { currentMonthIn } from "@keepitbalance/shared/dates";
import { monthSchema } from "@keepitbalance/shared/schemas";
import type { TransactionListParams } from "./types.ts";

export const TRANSACTIONS_PAGE_SIZE = 20;

export function readTransactionListParams(
  searchParams: URLSearchParams,
  timezone: string,
): TransactionListParams {
  const month = monthSchema.safeParse(searchParams.get("month"));
  const page = Number(searchParams.get("page"));
  return {
    month: month.success ? month.data : currentMonthIn(timezone),
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}
