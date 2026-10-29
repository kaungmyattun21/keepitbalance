import type { MonthlyBudgets } from "@keepitbalance/shared/finance";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { SectionCard } from "@/shared/components/SectionCard";
import { Button } from "@/shared/components/ui/button";
import { BudgetProgressItem } from "../../../shared/components/BudgetProgressItem.tsx";

const HIGHLIGHT_COUNT = 3;

function shareUsed(spent: string, amount: string): number {
  return Number(spent) / Number(amount);
}

export function BudgetHighlights({ monthlyBudgets }: { monthlyBudgets: MonthlyBudgets }) {
  const budgetsLink = `/finance/budgets?month=${monthlyBudgets.month}`;
  const mostUsed = [...monthlyBudgets.data]
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
        <ul className="flex flex-col gap-5">
          {mostUsed.map((budget) => (
            <BudgetProgressItem key={budget.id} budget={budget} />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
