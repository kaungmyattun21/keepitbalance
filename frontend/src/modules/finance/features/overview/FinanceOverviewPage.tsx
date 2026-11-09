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
import { CashFlowCard } from "./components/CashFlowCard.tsx";
import { FinanceShortcuts } from "./components/FinanceShortcuts.tsx";
import { SummaryStats } from "./components/SummaryStats.tsx";
import { useTransactionSummary } from "./hooks/use-transaction-summary.ts";

export function FinanceOverviewPage() {
  const { month, showMonth } = useMonthParam();
  const summary = useTransactionSummary(month);
  const monthlyBudgets = useMonthlyBudgets(month);
  const incomeCategories = summary.byCategory.filter((categoryTotal) => categoryTotal.type === "income");
  const expenseCategories = summary.byCategory.filter((categoryTotal) => categoryTotal.type === "expense");

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <DocumentTitle title="Finance overview" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="hidden font-heading text-lg font-semibold tracking-tight md:block">
          {formatMonth(month)} overview
        </h2>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
          <MonthSwitcher month={month} onMonthChange={showMonth} />
          <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
            <Link to={`/finance/transactions?month=${month}`}>
              Transactions
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 @4xl/finance:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <SummaryStats summary={summary} />
          <FinanceShortcuts month={month} />
        </div>
        <CashFlowCard summary={summary} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-6 @4xl/finance:grid-cols-3">
        <CategoryBreakdown
          title="Spending by category"
          emptyMessage="No expenses this month."
          categoryTotals={expenseCategories}
          grandTotal={summary.totalExpense}
          tone="expense"
        />
        <BudgetHighlights monthlyBudgets={monthlyBudgets} />
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
