import { CategoryIcon } from "../../../shared/components/CategoryIcon";
import type { Transaction } from "@keepitbalance/shared/finance";
import { ArrowDownLeft, ArrowUpRight, Pencil, ShoppingBasket, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { formatCalendarDate, formatMoney } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

type TransactionListItemProps = {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
};

export function TransactionListItem({ transaction, onEdit, onDelete }: TransactionListItemProps) {
  const isIncome = transaction.type === "income";
  const isShoppingExpense = transaction.shoppingListId !== null;
  const formattedDate = formatCalendarDate(transaction.date);
  const formattedAmount = formatMoney(transaction.amount);
  const accessibleName = `${transaction.category.name}, ${formattedAmount} on ${formattedDate}`;
  const TypeIcon = isIncome ? ArrowDownLeft : ArrowUpRight;

  return (
    <li className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-4 @lg/section:flex @lg/section:gap-3">
      {transaction.category.icon ? (
        <CategoryIcon icon={transaction.category.icon} className="row-span-2 size-9" />
      ) : (
        <span
          aria-hidden
          className={cn(
            "row-span-2 flex size-9 shrink-0 items-center justify-center rounded-xl",
            isIncome ? "bg-brand-subtle/60 text-brand" : "bg-muted text-muted-foreground",
          )}
        >
          <TypeIcon className="size-4" />
        </span>
      )}

      <div className="col-start-2 min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
          <span className="min-w-0 truncate">{transaction.category.name}</span>
          {isShoppingExpense && (
            <ShoppingBasket
              role="img"
              aria-label="From a shopping list"
              className="size-3.5 shrink-0 text-muted-foreground"
            />
          )}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {formattedDate}
          {transaction.note && ` · ${transaction.note}`}
        </p>
      </div>

      <p
        className={cn(
          "col-start-2 row-start-2 min-w-0 text-sm font-medium wrap-anywhere tabular-nums @lg/section:shrink-0",
          isIncome ? "text-brand" : "text-foreground",
        )}
      >
        <span className="sr-only">{isIncome ? "Income" : "Expense"} </span>
        <span aria-hidden>{isIncome ? "+" : "−"}</span>
        {formattedAmount}
      </p>

      <div className="col-start-3 row-span-2 row-start-1 flex shrink-0 items-center">
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          aria-label={`Edit ${accessibleName}`}
          onClick={() => onEdit(transaction)}
        >
          <Pencil />
        </Button>
        {!isShoppingExpense && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            aria-label={`Delete ${accessibleName}`}
            onClick={() => onDelete(transaction)}
          >
            <Trash2 />
          </Button>
        )}
      </div>
    </li>
  );
}
