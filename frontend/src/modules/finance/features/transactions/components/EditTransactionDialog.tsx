import type { Category, Transaction } from "@keepitbalance/shared/finance";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { TransactionForm } from "./TransactionForm.tsx";

type EditTransactionDialogProps = {
  transaction: Transaction | null;
  categories: Category[];
  onClose: () => void;
};

export function EditTransactionDialog({ transaction, categories, onClose }: EditTransactionDialogProps) {
  return (
    <Dialog open={transaction !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-6 overflow-y-auto p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">Edit transaction</DialogTitle>
          <DialogDescription>Saving replaces every field with what's below.</DialogDescription>
        </DialogHeader>
        {transaction && (
          <TransactionForm
            key={transaction.id}
            categories={categories}
            today={transaction.date}
            transaction={transaction}
            onSaved={onClose}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
