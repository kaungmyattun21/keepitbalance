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
    <div className="mt-5 flex flex-wrap justify-between gap-3 border-t pt-4">
      <Button
        variant="ghost"
        disabled={busy}
        aria-disabled={busy || pendingEdits}
        onClick={() => {
          if (!pendingEdits) onDelete();
        }}
      >
        Delete list
      </Button>
      <Button
        disabled={busy || !hasCheckedItems}
        aria-disabled={busy || pendingEdits || !hasCheckedItems}
        onClick={() => {
          if (!pendingEdits) onCheckout();
        }}
      >
        Finish shopping
      </Button>
    </div>
  );
}
