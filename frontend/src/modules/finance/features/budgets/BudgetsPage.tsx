import { useState } from "react";
import { Link, useLocation } from "react-router";
import { DocumentTitle } from "@/shared/components/DocumentTitle";
import { Sheet } from "@/shared/components/ui/sheet";
import { useCategoryGroups } from "../../shared/hooks/use-category-groups.ts";
import { useMonthlyBudgets } from "../../shared/hooks/use-monthly-budgets.ts";
import { useMonthParam } from "../../shared/hooks/use-month-param.ts";
import { BudgetList } from "./components/BudgetList.tsx";
import { BudgetsEmptyState } from "./components/BudgetsEmptyState.tsx";
import { ManageBudgetsDrawer } from "./components/ManageBudgetsDrawer.tsx";

export function BudgetsPage() {
  const location = useLocation();
  const { month, showMonth } = useMonthParam();
  const monthlyBudgets = useMonthlyBudgets(month);
  const expenseGroups = useCategoryGroups().filter((group) => group.type === "expense");
  const budgets = monthlyBudgets.groups.flatMap((group) => group.budgets);
  const hasBudgets = budgets.length > 0;
  const [drawerOpen, setDrawerOpen] = useState(!hasBudgets);
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <div className="w-full">
        <DocumentTitle title="Budgets" />
        <div className="mb-4 flex justify-end">
          <Link
            className="text-sm underline underline-offset-4"
            to="/finance/categories"
            state={{ returnTo: location.pathname + location.search }}
          >
            Manage categories
          </Link>
        </div>
        {hasBudgets ? (
          <BudgetList monthlyBudgets={monthlyBudgets} onMonthChange={showMonth} />
        ) : (
          <BudgetsEmptyState />
        )}
      </div>
      <ManageBudgetsDrawer
        expenseGroups={expenseGroups}
        budgets={budgets}
        onSaved={closeDrawer}
        onDismiss={closeDrawer}
      />
    </Sheet>
  );
}
