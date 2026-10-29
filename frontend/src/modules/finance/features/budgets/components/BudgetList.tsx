import type { MonthlyBudgets } from "@keepitbalance/shared/finance";
import { Pencil } from "lucide-react";
import { SectionCard } from "@/shared/components/SectionCard";
import { Button } from "@/shared/components/ui/button";
import { formatMoney } from "@/shared/lib/format";
import { BudgetProgressItem } from "../../../shared/components/BudgetProgressItem.tsx";
import { MonthSwitcher } from "../../../shared/components/MonthSwitcher.tsx";

type BudgetListProps = {
  monthlyBudgets: MonthlyBudgets;
  onMonthChange: (month: string) => void;
  onEdit: () => void;
};

export function BudgetList({ monthlyBudgets, onMonthChange, onEdit }: BudgetListProps) {
  return (
    <SectionCard
      title="Monthly budgets"
      description={`${formatMoney(monthlyBudgets.totalSpent)} spent of ${formatMoney(monthlyBudgets.totalBudget)}`}
      action={<MonthSwitcher month={monthlyBudgets.month} onMonthChange={onMonthChange} />}
    >
      <ul className="flex flex-col gap-6">
        {monthlyBudgets.data.map((budget) => (
          <BudgetProgressItem key={budget.id} budget={budget} />
        ))}
      </ul>
      <div className="mt-6 flex justify-end border-t pt-4">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil aria-hidden />
          Edit budgets
        </Button>
      </div>
    </SectionCard>
  );
}
