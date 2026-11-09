import { categoryChartColor } from "../../../shared/category-chart-colors";
import type { Budget, MonthlyBudgets } from "@keepitbalance/shared/finance";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { SectionCard } from "@/shared/components/SectionCard";
import { formatMoney } from "@/shared/lib/format";
import { Button } from "@/shared/components/ui/button";
import { BudgetProgressItem } from "../../../shared/components/BudgetProgressItem.tsx";

const HIGHLIGHT_COUNT = 3;

function shareUsed(spent: string, amount: string): number {
  return Number(spent) / Number(amount);
}

export function BudgetHighlights({ monthlyBudgets }: { monthlyBudgets: MonthlyBudgets }) {
  const used =
    Number(monthlyBudgets.totalBudget) > 0
      ? Math.round((Number(monthlyBudgets.totalSpent) / Number(monthlyBudgets.totalBudget)) * 100)
      : 0;
  const budgetsLink = `/finance/budgets?month=${monthlyBudgets.month}`;
  const budgets = monthlyBudgets.groups.flatMap((group) => group.budgets);
  const totalSpent = Number(monthlyBudgets.totalSpent);
  const totalBudget = Number(monthlyBudgets.totalBudget);
  const filled = totalBudget > 0 ? Math.min(totalSpent / totalBudget, 1) * 100 : 0;
  const segments: { budget: Budget; length: number; offset: number }[] = [];
  let offset = 0;
  for (const budget of budgets) {
    if (Number(budget.spent) <= 0) continue;
    const length = totalSpent > 0 ? (Number(budget.spent) / totalSpent) * filled : 0;
    segments.push({ budget, length, offset });
    offset += length;
  }
  const mostUsed = [...budgets]
    .sort((left, right) => shareUsed(right.spent, right.amount) - shareUsed(left.spent, left.amount))
    .slice(0, HIGHLIGHT_COUNT);

  return (
    <SectionCard
      title="Budgets"
      compactHeader
      action={
        mostUsed.length > 0 && (
          <Button asChild variant="ghost" size="sm">
            <Link to={budgetsLink}>
              All budgets
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        )
      }
    >
      {mostUsed.length === 0 ? (
        <div className="flex min-h-52 flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
          <p className="text-sm text-muted-foreground">No budgets yet.</p>
          <Button asChild variant="outline" size="sm">
            <Link to={budgetsLink}>Set up budgets</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-5 flex min-w-0 flex-wrap items-center gap-4">
            <div className="relative size-20 shrink-0">
              <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden>
                <circle cx="40" cy="40" r="33" fill="none" strokeWidth="6" className="stroke-muted" />
                {segments.map(({ budget, length, offset }) => (
                  <circle
                    key={budget.id}
                    cx="40"
                    cy="40"
                    r="33"
                    fill="none"
                    strokeWidth="6"
                    pathLength="100"
                    strokeDasharray={`${length} ${100 - length}`}
                    strokeDashoffset={-offset}
                    className={categoryChartColor(budget.category.icon, budget.category.id)}
                  />
                ))}
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-medium tabular-nums">
                <span className="max-w-14 text-center text-xs wrap-anywhere">{used}%</span>
              </span>
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <p className="text-xs text-muted-foreground">
                Budget used{used > 100 && <span className="font-medium text-expense"> · Over budget</span>}
              </p>
              <p className="mt-1 font-medium wrap-anywhere tabular-nums">
                {formatMoney(monthlyBudgets.totalSpent)}
              </p>
              <p className="mt-1 text-xs wrap-anywhere text-muted-foreground">
                of {formatMoney(monthlyBudgets.totalBudget)} planned
              </p>
            </div>
          </div>
          <p className="mb-4 text-xs font-medium text-muted-foreground">Most used categories</p>
          <ul className="flex flex-col gap-5">
            {mostUsed.map((budget) => (
              <BudgetProgressItem key={budget.id} budget={budget} />
            ))}
          </ul>
        </>
      )}
    </SectionCard>
  );
}
