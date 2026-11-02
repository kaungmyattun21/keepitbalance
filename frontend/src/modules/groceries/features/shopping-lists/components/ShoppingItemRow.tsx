import { Check, Pencil, X } from "lucide-react";
import { memo } from "react";
import type { ShoppingItem } from "@keepitbalance/shared/groceries";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { groceryError } from "../../../shared/use-grocery-mutations.ts";
import { useUpdateShoppingItem } from "../hooks/use-update-shopping-item.ts";

import { ShoppingItemPrice } from "./ShoppingItemPrice.tsx";

type Props = {
  listId: string;
  item: ShoppingItem;
  disabled: boolean;
  onEdit: (item: ShoppingItem) => void;
  onRemove: (item: ShoppingItem) => void;
};
export const ShoppingItemRow = memo(function ShoppingItemRow({
  listId,
  item,
  disabled,
  onEdit,
  onRemove,
}: Props) {
  const check = useUpdateShoppingItem(listId);
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_4.5rem] items-start gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_8rem_5rem] sm:gap-5">
      <label className="col-span-2 flex min-h-10 min-w-0 cursor-pointer items-center gap-3 sm:col-span-1">
        <span className="grid shrink-0 place-items-center">
          <input
            type="checkbox"
            checked={item.checked}
            disabled={disabled}
            aria-disabled={check.isPending || disabled}
            onChange={(event) => {
              if (!check.isPending)
                check.mutate(
                  { itemId: item.id, checked: event.target.checked },
                  { onError: (error) => toast.error(groceryError(error)) },
                );
            }}
            className="peer col-start-1 row-start-1 size-5 cursor-pointer appearance-none rounded-md border border-input bg-card checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring disabled:cursor-default disabled:opacity-50 forced-colors:appearance-auto"
          />
          <Check
            className="pointer-events-none col-start-1 row-start-1 size-3.5 text-primary-foreground opacity-0 peer-checked:opacity-100 forced-colors:hidden"
            strokeWidth={2.5}
            aria-hidden
          />
        </span>
        <span className={cn("min-w-0", item.checked && "text-muted-foreground")}>
          <span className={cn("block text-sm font-medium wrap-break-word", item.checked && "line-through")}>
            {item.ingredient.name}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
            {item.quantity} {item.ingredient.unit}
          </span>
        </span>
      </label>
      <ShoppingItemPrice listId={listId} item={item} disabled={disabled} />
      <div className="mt-5 flex h-10 items-center justify-end gap-1 sm:mt-0">
        <Button
          size="icon-sm"
          variant="ghost"
          className="rounded-full text-muted-foreground hover:text-foreground"
          title="Edit item"
          aria-label={`Edit ${item.ingredient.name}`}
          onClick={() => onEdit(item)}
        >
          <Pencil className="size-3.5" aria-hidden />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          disabled={disabled}
          className="rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          title="Remove item"
          aria-label={`Remove ${item.ingredient.name}`}
          onClick={() => onRemove(item)}
        >
          <X className="size-4" aria-hidden />
        </Button>
      </div>
    </li>
  );
});
