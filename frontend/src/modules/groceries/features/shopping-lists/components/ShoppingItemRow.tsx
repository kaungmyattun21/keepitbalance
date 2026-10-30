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
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto]">
      <label className="col-span-2 flex min-h-9 min-w-0 cursor-pointer items-center gap-3 sm:col-span-1 sm:mt-5">
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
          className="size-5 shrink-0 accent-brand"
        />
        <span className={cn("min-w-0", item.checked && "text-muted-foreground")}>
          <span className={cn("block font-medium wrap-break-word", item.checked && "line-through")}>
            {item.ingredient.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {item.quantity} {item.ingredient.unit}
          </span>
        </span>
      </label>
      <ShoppingItemPrice listId={listId} item={item} disabled={disabled} />
      <div className="mt-5 flex h-9 items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          aria-label={`Edit ${item.ingredient.name}`}
          onClick={() => onEdit(item)}
        >
          Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={disabled}
          aria-label={`Remove ${item.ingredient.name}`}
          onClick={() => onRemove(item)}
        >
          Remove
        </Button>
      </div>
    </li>
  );
});
