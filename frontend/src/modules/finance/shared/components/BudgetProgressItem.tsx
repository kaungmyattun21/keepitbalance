import { categoryChartColor } from "../category-chart-colors";
import { CategoryIcon } from "./CategoryIcon";
import type { Budget } from "@keepitbalance/shared/finance";
import { formatMoney } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

export function BudgetProgressItem({ budget }: { budget: Budget }) {
  const amount = Number(budget.amount);
  const share = amount > 0 ? Number(budget.spent) / amount : 0;
  const isOver = budget.remaining.startsWith("-");
  const percentage = Math.round(share * 100);

  return (
    <li className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="flex min-w-0 basis-32 items-center gap-2 font-medium">
          <CategoryIcon icon={budget.category.icon} />
          <span className="min-w-0 wrap-anywhere">{budget.category.name}</span>
        </span>
        <span className="max-w-full text-sm wrap-anywhere tabular-nums">
          {formatMoney(budget.spent)}
          <span className="text-muted-foreground"> of {formatMoney(budget.amount)}</span>
        </span>
      </div>
      <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", categoryChartColor(budget.category.icon, budget.category.id))}
          style={{ width: `${Math.min(share, 1) * 100}%` }}
        />
      </div>
      <p
        className={cn(
          "text-xs wrap-anywhere tabular-nums",
          isOver ? "font-medium text-expense" : "text-muted-foreground",
        )}
      >
        {isOver
          ? `Over by ${formatMoney(budget.remaining.slice(1))} (${percentage}% used)`
          : `${formatMoney(budget.remaining)} left (${percentage}% used)`}
      </p>
    </li>
  );
}
