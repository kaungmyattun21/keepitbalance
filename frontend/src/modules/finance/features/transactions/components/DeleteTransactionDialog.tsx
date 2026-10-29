import type { Transaction } from "@keepitbalance/shared/finance";
import type { MouseEvent } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { ApiError } from "@/shared/lib/api";
import { formatCalendarDate, formatMoney } from "@/shared/lib/format";
import { useDeleteTransaction } from "../hooks/use-delete-transaction.ts";

type DeleteTransactionDialogProps = {
  transaction: Transaction | null;
  onClose: () => void;
};

export function DeleteTransactionDialog({ transaction, onClose }: DeleteTransactionDialogProps) {
  const deleteTransaction = useDeleteTransaction();

  async function confirmDelete(event: MouseEvent) {
    event.preventDefault();
    if (!transaction) return;
    try {
      await deleteTransaction.mutateAsync(transaction.id);
      toast.success("Transaction deleted.");
      onClose();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete the transaction. Try again.");
    }
  }

  return (
    <AlertDialog open={transaction !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
          <AlertDialogDescription>
            {transaction &&
              `${transaction.category.name}, ${formatMoney(transaction.amount)} on ${formatCalendarDate(transaction.date)}. `}
            This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteTransaction.isPending}
            onClick={(event) => void confirmDelete(event)}
          >
            {deleteTransaction.isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
