import { readMonthParam } from "../../shared/month-param.ts";
import type { TransactionListParams } from "./types.ts";

export const TRANSACTIONS_PAGE_SIZE = 20;

export function readTransactionListParams(
  searchParams: URLSearchParams,
  timezone: string,
): TransactionListParams {
  const page = Number(searchParams.get("page"));
  return {
    month: readMonthParam(searchParams, timezone),
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}
