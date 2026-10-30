import type { Bill } from "@keepitbalance/shared/finance";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/shared/components/ui/alert-dialog";
import { ApiError } from "@/shared/lib/api";
import { useDeleteBill } from "../hooks/use-bill-mutations.ts";

export function DeleteBillDialog({ bill, onClose }: { bill: Bill | null; onClose: () => void }) {
  const mutation = useDeleteBill();
  async function remove() {
    if (!bill) return;
    try {
      await mutation.mutateAsync(bill.id);
      toast.success("Bill deleted.");
      onClose();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't delete the bill. Try again.");
    }
  }
  return (
    <AlertDialog open={bill !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this bill?</AlertDialogTitle>
          <AlertDialogDescription>
            {bill?.name} will be removed from your schedule. Expenses already recorded stay in your
            transactions.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={(event) => {
              event.preventDefault();
              void remove();
            }}
          >
            {mutation.isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
