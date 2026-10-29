import type { Budget } from "@keepitbalance/shared/finance";
import { formatMoney } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

export function BudgetProgressItem({ budget }: { budget: Budget }) {
  const amount = Number(budget.amount);
  const share = amount > 0 ? Number(budget.spent) / amount : 0;
  const isOver = budget.remaining.startsWith("-");
  const percentage = Math.round(share * 100);

  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate font-medium">{budget.category.name}</span>
        <span className="shrink-0 text-sm tabular-nums">
          {formatMoney(budget.spent)}
          <span className="text-muted-foreground"> of {formatMoney(budget.amount)}</span>
        </span>
      </div>
      <div aria-hidden className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-[width]", isOver ? "bg-expense" : "bg-brand")}
          style={{ width: `${Math.min(share, 1) * 100}%` }}
        />
      </div>
      <p
        className={cn("text-xs tabular-nums", isOver ? "font-medium text-expense" : "text-muted-foreground")}
      >
        {isOver
          ? `Over by ${formatMoney(budget.remaining.slice(1))} (${percentage}% used)`
          : `${formatMoney(budget.remaining)} left (${percentage}% used)`}
      </p>
    </li>
  );
}
