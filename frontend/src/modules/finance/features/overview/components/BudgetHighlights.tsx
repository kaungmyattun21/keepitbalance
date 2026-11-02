import type { MonthlyBudgets } from "@keepitbalance/shared/finance";
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
  const mostUsed = monthlyBudgets.groups
    .flatMap((group) => group.budgets)
    .sort((left, right) => shareUsed(right.spent, right.amount) - shareUsed(left.spent, left.amount))
    .slice(0, HIGHLIGHT_COUNT);

  return (
    <SectionCard
      title="Budgets"
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
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-muted-foreground">No budgets yet.</p>
          <Button asChild variant="outline" size="sm">
            <Link to={budgetsLink}>Set up budgets</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-6 flex min-w-0 flex-wrap items-center gap-4 border-b border-border/60 pb-6">
            <div className="relative size-20 shrink-0">
              <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden>
                <circle cx="40" cy="40" r="33" fill="none" strokeWidth="6" className="stroke-muted" />
                <circle
                  cx="40"
                  cy="40"
                  r="33"
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  pathLength="100"
                  strokeDasharray={`${Math.min(used, 100)} 100`}
                  className={used > 100 ? "stroke-expense" : "stroke-brand"}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-medium tabular-nums">
                <span className="max-w-14 text-center text-xs wrap-anywhere">{used}%</span>
              </span>
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <p className="text-xs text-muted-foreground">Budget used</p>
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
