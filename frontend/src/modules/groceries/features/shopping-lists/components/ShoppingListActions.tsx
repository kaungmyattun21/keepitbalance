import { ArrowUpRight, Trash2 } from "lucide-react";
import { useIsMutating } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { groceryKeys } from "../../../shared/queries.ts";

export function ShoppingListActions({
  listId,
  busy,
  hasCheckedItems,
  onDelete,
  onCheckout,
}: {
  listId: string;
  busy: boolean;
  hasCheckedItems: boolean;
  onDelete: () => void;
  onCheckout: () => void;
}) {
  const pendingEdits = useIsMutating({ mutationKey: [...groceryKeys.itemUpdates, listId] }) > 0;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-5 pb-4">
      <Button
        variant="ghost"
        className="rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        disabled={busy}
        aria-disabled={busy || pendingEdits}
        onClick={() => {
          if (!pendingEdits) onDelete();
        }}
      >
        <Trash2 className="size-3.5" aria-hidden />
        Delete list
      </Button>
      <Button
        className="rounded-full px-5"
        disabled={busy || !hasCheckedItems}
        aria-disabled={busy || pendingEdits || !hasCheckedItems}
        onClick={() => {
          if (!pendingEdits) onCheckout();
        }}
      >
        Finish shopping
        <ArrowUpRight className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
