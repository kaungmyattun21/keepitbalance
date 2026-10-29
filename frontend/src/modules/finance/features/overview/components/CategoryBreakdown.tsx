import type { CategoryTotal } from "@keepitbalance/shared/finance";
import { SectionCard } from "@/shared/components/SectionCard";
import { formatMoney } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

type CategoryBreakdownProps = {
  title: string;
  emptyMessage: string;
  categoryTotals: CategoryTotal[];
  grandTotal: string;
  tone: "income" | "expense";
};

export function CategoryBreakdown({
  title,
  emptyMessage,
  categoryTotals,
  grandTotal,
  tone,
}: CategoryBreakdownProps) {
  const grandTotalValue = Number(grandTotal);

  return (
    <SectionCard title={title}>
      {categoryTotals.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {categoryTotals.map((categoryTotal) => {
            const share = grandTotalValue > 0 ? Number(categoryTotal.total) / grandTotalValue : 0;
            const percentage = Math.round(share * 100);
            return (
              <li key={categoryTotal.categoryId} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{categoryTotal.name}</span>
                  <span className="shrink-0 tabular-nums">
                    {formatMoney(categoryTotal.total)}
                    <span className="ml-2 text-muted-foreground">{percentage}%</span>
                  </span>
                </div>
                <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", tone === "income" ? "bg-brand" : "bg-expense")}
                    style={{ width: `${Math.max(share * 100, 2)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
