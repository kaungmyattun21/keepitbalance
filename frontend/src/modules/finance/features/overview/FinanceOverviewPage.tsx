import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { DocumentTitle } from "@/shared/components/DocumentTitle";
import { Button } from "@/shared/components/ui/button";
import { formatMonth } from "@/shared/lib/format";
import { MonthSwitcher } from "../../shared/components/MonthSwitcher.tsx";
import { useMonthlyBudgets } from "../../shared/hooks/use-monthly-budgets.ts";
import { useMonthParam } from "../../shared/hooks/use-month-param.ts";
import { BudgetHighlights } from "./components/BudgetHighlights.tsx";
import { CategoryBreakdown } from "./components/CategoryBreakdown.tsx";
import { SummaryStats } from "./components/SummaryStats.tsx";
import { useTransactionSummary } from "./hooks/use-transaction-summary.ts";

export function FinanceOverviewPage() {
  const { month, showMonth } = useMonthParam();
  const summary = useTransactionSummary(month);
  const monthlyBudgets = useMonthlyBudgets(month);
  const incomeCategories = summary.byCategory.filter((categoryTotal) => categoryTotal.type === "income");
  const expenseCategories = summary.byCategory.filter((categoryTotal) => categoryTotal.type === "expense");

  return (
    <div className="flex flex-col gap-6">
      <DocumentTitle title="Finance overview" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold tracking-tight">{formatMonth(month)} overview</h2>
        <div className="flex items-center gap-2">
          <MonthSwitcher month={month} onMonthChange={showMonth} />
          <Button asChild variant="outline" size="sm">
            <Link to={`/finance/transactions?month=${month}`}>
              Transactions
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </div>

      <SummaryStats summary={summary} />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <BudgetHighlights monthlyBudgets={monthlyBudgets} />
        <CategoryBreakdown
          title="Spending by category"
          emptyMessage="No expenses this month."
          categoryTotals={expenseCategories}
          grandTotal={summary.totalExpense}
          tone="expense"
        />
        <CategoryBreakdown
          title="Income by category"
          emptyMessage="No income this month."
          categoryTotals={incomeCategories}
          grandTotal={summary.totalIncome}
          tone="income"
        />
      </div>
    </div>
  );
}
