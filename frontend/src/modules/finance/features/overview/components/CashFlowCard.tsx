import type { TransactionSummary } from "@keepitbalance/shared/finance";
import { ArrowLeftRight, ArrowUpRight, CircleMinus, CirclePlus } from "lucide-react";
import { Link } from "react-router";
import { formatMoney } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

export function CashFlowCard({ summary }: { summary: TransactionSummary }) {
  const income = Number(summary.totalIncome);
  const expenses = Number(summary.totalExpense);
  const max = Math.max(income, expenses);
  const over = expenses > income;
  const active = max > 0;
  const spentPercent = income > 0 ? Math.round((expenses / income) * 100) : null;
  const StatusIcon = over ? CircleMinus : CirclePlus;
  return (
    <section
      aria-labelledby="cash-flow-heading"
      className="flex min-w-0 flex-col rounded-2xl border border-border/70 bg-card p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="cash-flow-heading" className="text-base font-medium tracking-tight">
          Cash flow
        </h2>
        <ArrowLeftRight className="size-4 text-muted-foreground" aria-hidden />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">What came in. What went out.</p>
      <dl className="my-5 space-y-4">
        {[
          {
            label: "Money in",
            amount: summary.totalIncome,
            value: income,
            color: "bg-brand",
            textColor: "text-brand",
          },
          {
            label: "Money out",
            amount: summary.totalExpense,
            value: expenses,
            color: "bg-expense",
            textColor: "text-expense",
          },
        ].map(({ label, amount, value, color, textColor }) => (
          <div key={label}>
            <div className="mb-2 flex min-w-0 flex-wrap items-baseline justify-between gap-2 text-sm">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className={cn("font-medium wrap-anywhere tabular-nums", textColor)}>
                {formatMoney(amount)}
              </dd>
            </div>
            <div aria-hidden className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", color)}
                style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </dl>
      <div className="mt-auto border-t border-border/60 pt-4">
        <p
          className={cn(
            "flex items-center gap-2 text-sm font-medium",
            active && over ? "text-expense" : "text-foreground",
          )}
        >
          <StatusIcon className="size-4 shrink-0" aria-hidden />
          {!active ? "Your month starts here" : over ? "Spending above income" : "Spending within income"}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed wrap-anywhere text-muted-foreground">
          {spentPercent !== null
            ? `${spentPercent}% of recorded income spent this month.`
            : active
              ? "Add your income to complete the picture."
              : "Record your income and expenses to see the picture."}
        </p>
        <Link
          to={`/finance/transactions?month=${summary.month}`}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          View activity <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
