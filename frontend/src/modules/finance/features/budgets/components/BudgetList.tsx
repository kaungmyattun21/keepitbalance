import type { MonthlyBudgets } from "@keepitbalance/shared/finance";
import { SheetTrigger } from "@/shared/components/ui/sheet";
import { Pencil } from "lucide-react";
import { SectionCard } from "@/shared/components/SectionCard";
import { Button } from "@/shared/components/ui/button";
import { formatMoney } from "@/shared/lib/format";
import { BudgetProgressItem } from "../../../shared/components/BudgetProgressItem.tsx";
import { MonthSwitcher } from "../../../shared/components/MonthSwitcher.tsx";

type BudgetListProps = {
  monthlyBudgets: MonthlyBudgets;
  onMonthChange: (month: string) => void;
};

export function BudgetList({ monthlyBudgets, onMonthChange }: BudgetListProps) {
  return (
    <SectionCard
      title="Monthly budgets"
      description={`${formatMoney(monthlyBudgets.totalSpent)} spent of ${formatMoney(monthlyBudgets.totalBudget)}`}
      action={<MonthSwitcher month={monthlyBudgets.month} onMonthChange={onMonthChange} />}
    >
      <ul className="flex flex-col gap-6">
        {monthlyBudgets.groups.map((entry) => (
          <li key={entry.group.id}>
            <details open className="rounded-lg border p-4">
              <summary className="cursor-pointer font-semibold">
                {entry.group.name}
                <span className="mt-1 block text-sm font-normal text-muted-foreground tabular-nums">
                  {formatMoney(entry.spent)} spent of {formatMoney(entry.amount)} ·{" "}
                  {entry.remaining.startsWith("-")
                    ? `Over by ${formatMoney(entry.remaining.slice(1))}`
                    : `${formatMoney(entry.remaining)} left`}
                </span>
              </summary>
              <ul className="mt-5 flex flex-col gap-5">
                {entry.budgets.map((budget) => (
                  <BudgetProgressItem key={budget.id} budget={budget} />
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex justify-end border-t pt-4">
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            <Pencil aria-hidden />
            Manage budgets
          </Button>
        </SheetTrigger>
      </div>
    </SectionCard>
  );
}
