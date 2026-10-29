import type { TransactionSummary } from "@keepitbalance/shared/finance";
import { ArrowDownLeft, ArrowUpRight, Scale, type LucideIcon } from "lucide-react";
import { formatMoney } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

type SummaryStat = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: "income" | "expense";
};

function signedMoney(amount: string): string {
  return amount.startsWith("-") ? `−${formatMoney(amount.slice(1))}` : `+${formatMoney(amount)}`;
}

export function SummaryStats({ summary }: { summary: TransactionSummary }) {
  const netIsNegative = summary.net.startsWith("-");
  const stats: SummaryStat[] = [
    { label: "Income", value: formatMoney(summary.totalIncome), icon: ArrowDownLeft, tone: "income" },
    { label: "Expenses", value: formatMoney(summary.totalExpense), icon: ArrowUpRight, tone: "expense" },
    {
      label: "Net balance",
      value: signedMoney(summary.net),
      icon: Scale,
      tone: netIsNegative ? "expense" : "income",
    },
  ];

  return (
    <dl className="grid gap-4 sm:grid-cols-3">
      {stats.map(({ label, value, icon: Icon, tone }) => (
        <div
          key={label}
          className="flex flex-col gap-3 rounded-xl bg-card p-5 text-card-foreground shadow-xs ring-1 ring-foreground/8 dark:ring-border"
        >
          <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span
              aria-hidden
              className={cn(
                "flex size-7 items-center justify-center rounded-full",
                tone === "income" ? "bg-brand-subtle text-brand" : "bg-expense-subtle text-expense",
              )}
            >
              <Icon className="size-3.5" />
            </span>
            {label}
          </dt>
          <dd
            className={cn(
              "font-heading text-2xl font-semibold tracking-tight tabular-nums",
              tone === "income" ? "text-brand" : "text-expense",
            )}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
