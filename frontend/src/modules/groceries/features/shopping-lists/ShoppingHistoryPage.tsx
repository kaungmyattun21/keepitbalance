import { ArrowUpRight, Check, Minus, Receipt } from "lucide-react";
import { Link } from "react-router";
import { DocumentTitle } from "@/shared/components/DocumentTitle";
import { SectionCard } from "@/shared/components/SectionCard";
import { formatMoney, formatCalendarDate } from "@/shared/lib/format";
import { useShoppingHistory } from "../../shared/queries.ts";

export function ShoppingHistoryPage() {
  const lists = useShoppingHistory();
  return (
    <div className="flex w-full flex-col gap-5">
      <DocumentTitle title="Shopping history" />
      <h2 className="text-lg font-medium tracking-tight">Shopping history</h2>
      {lists.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-card px-6 py-20 text-center">
          <Receipt className="mb-1 size-8 text-muted-foreground" strokeWidth={1.5} aria-hidden />
          <p className="text-sm text-muted-foreground tabular-nums">No completed shopping trips yet.</p>
        </div>
      )}
      {lists.map((list) => (
        <SectionCard
          key={list.id}
          title={
            list.transaction ? `Purchased ${formatCalendarDate(list.transaction.date)}` : "Completed shopping"
          }
          description={list.transaction ? `${formatMoney(list.transaction.amount)} spent` : undefined}
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/15 bg-brand-subtle/50 px-2.5 py-1 text-xs font-medium text-brand">
              <Check className="size-3.5" aria-hidden />
              Completed
            </span>
          }
        >
          <ul className="space-y-1">
            {list.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
                <span className="flex min-w-0 items-center gap-3 wrap-break-word">
                  {item.checked ? (
                    <Check aria-label="Purchased" className="size-4 text-brand" />
                  ) : (
                    <Minus aria-label="Not purchased" className="size-4 text-muted-foreground" />
                  )}
                  {item.ingredient.name}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {item.quantity} {item.ingredient.unit}
                  {item.price !== null && ` · ${formatMoney(item.price)}`}
                  {!item.checked && " · Not purchased"}
                </span>
              </li>
            ))}
          </ul>
          {list.transaction && (
            <Link
              className="my-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              to={`/finance/transactions?month=${list.transaction.date.slice(0, 7)}`}
            >
              View expense in Finance <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          )}
        </SectionCard>
      ))}
    </div>
  );
}
