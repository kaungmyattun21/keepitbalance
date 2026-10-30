import { Check, Minus } from "lucide-react";
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
      <h2 className="text-lg font-semibold">Shopping history</h2>
      {lists.length === 0 && (
        <p className="text-sm text-muted-foreground">No completed shopping trips yet.</p>
      )}
      {lists.map((list) => (
        <SectionCard
          key={list.id}
          title={
            list.transaction ? `Purchased ${formatCalendarDate(list.transaction.date)}` : "Completed shopping"
          }
          description={list.transaction ? `${formatMoney(list.transaction.amount)} spent` : undefined}
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-subtle px-2.5 py-1 text-xs font-medium text-brand">
              <Check className="size-3.5" aria-hidden />
              Completed
            </span>
          }
        >
          <ul className="divide-y">
            {list.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                <span className="flex items-center gap-2">
                  {item.checked ? (
                    <Check aria-label="Purchased" className="size-4 text-brand" />
                  ) : (
                    <Minus aria-label="Not purchased" className="size-4 text-muted-foreground" />
                  )}
                  {item.ingredient.name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {item.quantity} {item.ingredient.unit}
                  {item.price !== null && ` · ${formatMoney(item.price)}`}
                  {!item.checked && " · Not purchased"}
                </span>
              </li>
            ))}
          </ul>
          {list.transaction && (
            <Link
              className="mt-4 inline-block text-sm underline underline-offset-4"
              to={`/finance/transactions?month=${list.transaction.date.slice(0, 7)}`}
            >
              View expense in Finance
            </Link>
          )}
        </SectionCard>
      ))}
    </div>
  );
}
