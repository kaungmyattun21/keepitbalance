import { currentMonthIn } from "@keepitbalance/shared/dates";
import { monthSchema } from "@keepitbalance/shared/schemas";

export function readMonthParam(searchParams: URLSearchParams, timezone: string): string {
  const month = monthSchema.safeParse(searchParams.get("month"));
  return month.success ? month.data : currentMonthIn(timezone);
}
