import { useSearchParams } from "react-router";
import { useCurrentUser } from "@/modules/auth";
import { readTransactionListParams } from "../transaction-list-params.ts";

export function useTransactionListParams() {
  const user = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const { month, page } = readTransactionListParams(searchParams, user.timezone ?? "UTC");

  function showMonth(nextMonth: string) {
    setSearchParams({ month: nextMonth }, { preventScrollReset: true });
  }

  function showPage(nextPage: number) {
    setSearchParams({ month, page: String(nextPage) }, { preventScrollReset: true });
  }

  return { month, page, showMonth, showPage };
}
