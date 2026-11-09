import { todayIn } from "@keepitbalance/shared/dates";
import {
  mondayOf,
  weekQuerySchema,
  planningDateRangeSchema,
  type PlanningPeriod,
  type PlanningDateRange,
} from "@keepitbalance/shared/meal-planning";
export function planningWeek(params: URLSearchParams, timezone: string) {
  const parsed = weekQuerySchema.safeParse({ weekStart: params.get("week") });
  return parsed.success ? parsed.data.weekStart : mondayOf(todayIn(timezone));
}

export function planningPeriod(
  params: URLSearchParams,
  timezone: string,
  saved: PlanningDateRange | null = null,
): PlanningPeriod {
  const range = planningDateRangeSchema.safeParse({
    startDate: params.get("start"),
    endDate: params.get("end"),
  });
  if (range.success) return range.data;
  const week = weekQuerySchema.safeParse({ weekStart: params.get("week") });
  if (week.success) return week.data;
  return saved ?? { weekStart: planningWeek(params, timezone) };
}
