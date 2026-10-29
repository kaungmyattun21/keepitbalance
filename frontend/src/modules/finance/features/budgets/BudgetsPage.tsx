import { useState } from "react";
import { DocumentTitle } from "@/shared/components/DocumentTitle";
import { useCategories } from "../../shared/hooks/use-categories.ts";
import { useMonthlyBudgets } from "../../shared/hooks/use-monthly-budgets.ts";
import { useMonthParam } from "../../shared/hooks/use-month-param.ts";
import { BudgetForm } from "./components/BudgetForm.tsx";
import { BudgetList } from "./components/BudgetList.tsx";
import { BudgetsEmptyState } from "./components/BudgetsEmptyState.tsx";
import type { BudgetsView } from "./types.ts";

export function BudgetsPage() {
  const { month, showMonth } = useMonthParam();
  const monthlyBudgets = useMonthlyBudgets(month);
  const expenseCategories = useCategories().filter((category) => category.type === "expense");
  const [view, setView] = useState<BudgetsView>("default");
  const hasBudgets = monthlyBudgets.data.length > 0;

  function renderContent() {
    if (view === "editing" || (!hasBudgets && view === "default")) {
      return (
        <BudgetForm
          mode={hasBudgets ? "edit" : "setup"}
          expenseCategories={expenseCategories}
          budgets={monthlyBudgets.data}
          onSaved={() => setView("default")}
          onDismiss={() => setView(hasBudgets ? "default" : "skipped")}
        />
      );
    }
    if (!hasBudgets) return <BudgetsEmptyState onSetUp={() => setView("editing")} />;
    return (
      <BudgetList
        monthlyBudgets={monthlyBudgets}
        onMonthChange={showMonth}
        onEdit={() => setView("editing")}
      />
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <DocumentTitle title="Budgets" />
      {renderContent()}
    </div>
  );
}
