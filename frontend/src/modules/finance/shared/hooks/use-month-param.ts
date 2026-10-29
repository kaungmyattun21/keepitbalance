import { useSearchParams } from "react-router";
import { useCurrentUser } from "@/modules/auth";
import { readMonthParam } from "../month-param.ts";

export function useMonthParam() {
  const user = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const month = readMonthParam(searchParams, user.timezone ?? "UTC");

  function showMonth(nextMonth: string) {
    setSearchParams({ month: nextMonth }, { preventScrollReset: true });
  }

  return { month, showMonth };
}
