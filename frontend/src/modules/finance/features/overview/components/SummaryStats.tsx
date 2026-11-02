import type { TransactionSummary } from "@keepitbalance/shared/finance";
import { ArrowDownLeft, ArrowUpRight, Plus, WalletCards } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Link } from "react-router";
import { Button } from "@/shared/components/ui/button";
import { formatMoney, formatMonth } from "@/shared/lib/format";

function signedMoney(amount: string): string {
  return amount.startsWith("-") ? `−${formatMoney(amount.slice(1))}` : `+${formatMoney(amount)}`;
}

export function SummaryStats({ summary }: { summary: TransactionSummary }) {
  return (
    <section
      aria-label="Monthly balance"
      className="@container/balance relative isolate flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-5 text-card-foreground sm:p-6"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-28 -right-28 -z-10 size-80 rounded-full border border-foreground/8"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 -z-10 size-56 rounded-full border border-foreground/8"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <WalletCards className="size-4" aria-hidden /> Monthly snapshot
        </span>
        <span className="rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground">
          {formatMonth(summary.month)}
        </span>
      </div>
      <dl className="my-5">
        <dt className="text-xs text-muted-foreground">Net balance</dt>
        <dd className="mt-1.5 text-[clamp(1.5rem,8cqi,2.5rem)] leading-tight font-medium tracking-tight wrap-anywhere tabular-nums">
          {signedMoney(summary.net)}
        </dd>
      </dl>
      <p className="-mt-2 mb-4 text-xs leading-relaxed text-muted-foreground">
        Income minus expenses for the selected month.
      </p>
      <dl className="grid min-w-0 grid-cols-1 gap-3 border-t border-border/60 pt-4 @xs/balance:grid-cols-2">
        {[
          {
            label: "Income",
            amount: summary.totalIncome,
            icon: ArrowDownLeft,
            color: "text-brand",
            tint: "bg-brand-subtle",
          },
          {
            label: "Expenses",
            amount: summary.totalExpense,
            icon: ArrowUpRight,
            color: "text-expense",
            tint: "bg-expense-subtle",
          },
        ].map(({ label, amount, icon: Icon, color, tint }) => (
          <div key={label} className="min-w-0">
            <dt className={cn("mb-1 flex items-center gap-2 text-xs", color)}>
              <span className={cn("grid size-5 shrink-0 place-items-center rounded-full", tint)}>
                <Icon className="size-3" aria-hidden />
              </span>
              {label}
            </dt>
            <dd className={cn("text-lg font-medium wrap-anywhere tabular-nums", color)}>
              {formatMoney(amount)}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button asChild size="sm" variant="outline" className="px-4">
          <Link to={`/finance/transactions?month=${summary.month}`}>
            <Plus className="size-3.5" aria-hidden /> Record transaction
          </Link>
        </Button>
        <Link
          to={`/finance/budgets?month=${summary.month}`}
          className="rounded-full px-2 py-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Manage budgets
        </Link>
      </div>
    </section>
  );
}
