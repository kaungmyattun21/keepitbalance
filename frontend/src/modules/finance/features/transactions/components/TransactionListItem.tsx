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
    <li className="flex items-center gap-3 py-3">
      <span
        aria-hidden
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          isIncome ? "bg-brand-subtle text-brand" : "bg-expense-subtle text-expense",
        )}
      >
        <TypeIcon className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate font-medium">
          {transaction.category.name}
          {isShoppingExpense && (
            <ShoppingBasket
              role="img"
              aria-label="From a shopping list"
              className="size-3.5 text-muted-foreground"
            />
          )}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {formattedDate}
          {transaction.note && ` · ${transaction.note}`}
        </p>
      </div>

      <p className={cn("shrink-0 font-semibold tabular-nums", isIncome ? "text-brand" : "text-expense")}>
        <span className="sr-only">{isIncome ? "Income" : "Expense"} </span>
        <span aria-hidden>{isIncome ? "+" : "−"}</span>
        {formattedAmount}
      </p>

      <div className="flex shrink-0 items-center">
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
