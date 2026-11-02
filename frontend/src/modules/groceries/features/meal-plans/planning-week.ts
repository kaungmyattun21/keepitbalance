import { todayIn } from "@keepitbalance/shared/dates";
import { mondayOf, weekQuerySchema } from "@keepitbalance/shared/meal-planning";
export function planningWeek(params: URLSearchParams, timezone: string) {
  const parsed = weekQuerySchema.safeParse({ weekStart: params.get("week") });
  return parsed.success ? parsed.data.weekStart : mondayOf(todayIn(timezone));
}
