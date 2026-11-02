import type { CategoryTotal } from "@keepitbalance/shared/finance";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { SectionCard } from "@/shared/components/SectionCard";
import { formatMoney } from "@/shared/lib/format";

const colors = ["bg-emerald-500", "bg-teal-400", "bg-cyan-600", "bg-slate-400", "bg-emerald-700"];

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
  const total = Number(grandTotal);
  const categories = [...categoryTotals].sort((a, b) => Number(b.total) - Number(a.total));
  const Icon = tone === "income" ? ArrowDownLeft : ArrowUpRight;
  return (
    <SectionCard title={title}>
      {categories.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
            <Icon className="size-4" aria-hidden />
          </span>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {tone === "income" ? "Total received" : "Total spent"}
          </p>
          <p className="mt-1 text-2xl font-medium tracking-tight wrap-anywhere tabular-nums">
            {formatMoney(grandTotal)}
          </p>
          <div aria-hidden className="mt-5 mb-6 flex h-2.5 overflow-hidden rounded-full bg-muted">
            {categories.map((category, index) => (
              <span
                key={category.categoryId}
                className={colors[index % colors.length]}
                style={{ width: `${total > 0 ? (Number(category.total) / total) * 100 : 0}%` }}
              />
            ))}
          </div>
          <ul className="divide-y divide-border/60">
            {categories.map((category, index) => (
              <li
                key={category.categoryId}
                className="flex min-w-0 flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="flex min-w-0 basis-28 items-center gap-2 text-sm">
                  <span
                    className={`size-2 shrink-0 rounded-full ${colors[index % colors.length]}`}
                    aria-hidden
                  />
                  <span className="min-w-0 truncate font-medium" title={category.name}>
                    {category.name}
                  </span>
                </span>
                <span className="max-w-full text-right text-sm wrap-anywhere tabular-nums">
                  <span className="block font-medium">{formatMoney(category.total)}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {Math.round(total > 0 ? (Number(category.total) / total) * 100 : 0)}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </SectionCard>
  );
}
