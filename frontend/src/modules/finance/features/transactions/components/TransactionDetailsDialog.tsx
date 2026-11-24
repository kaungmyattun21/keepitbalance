import { useQuery } from "@tanstack/react-query";
import type { Transaction } from "@keepitbalance/shared/finance";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { FormAlert } from "@/shared/components/form/FormAlert";
import { Button } from "@/shared/components/ui/button";
import { api } from "@/shared/lib/api";
import { formatCalendarDate, formatMoney } from "@/shared/lib/format";
import { financeKeys } from "../../../shared/query-keys.ts";
import { ReceiptImage } from "../../receipts/components/ReceiptImage.tsx";

export function TransactionDetailsDialog({
  transaction,
  onClose,
  onEdit,
}: {
  transaction: Transaction | null;
  onClose: () => void;
  onEdit: (transaction: Transaction) => void;
}) {
  const query = useQuery({
    queryKey: [...financeKeys.transactions(), "detail", transaction?.id],
    queryFn: ({ signal }) => api.get<Transaction>(`/transactions/${transaction!.id}`, { signal }),
    enabled: Boolean(transaction),
    initialData: transaction ?? undefined,
    staleTime: 0,
  });
  const detail = query.data;
  return (
    <Dialog
      open={Boolean(transaction)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Transaction details</DialogTitle>
          <DialogDescription>Transaction information and its attached receipt.</DialogDescription>
        </DialogHeader>
        {query.isError && <FormAlert message={query.error.message} />}
        {detail && (
          <div className="space-y-5">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="text-right font-medium tabular-nums">{formatMoney(detail.amount)}</dd>
              <dt className="text-muted-foreground">Type</dt>
              <dd className="text-right capitalize">{detail.type}</dd>
              <dt className="text-muted-foreground">Date</dt>
              <dd className="text-right">{formatCalendarDate(detail.date)}</dd>
              <dt className="text-muted-foreground">Category</dt>
              <dd className="text-right">{detail.category.name}</dd>
              {detail.note && (
                <>
                  <dt className="text-muted-foreground">Note</dt>
                  <dd className="text-right wrap-anywhere whitespace-pre-wrap">{detail.note}</dd>
                </>
              )}
            </dl>
            {detail.receipt && (
              <section aria-label="Transaction receipt" className="space-y-2">
                <h3 className="text-sm font-medium">Receipt</h3>
                <ReceiptImage key={detail.receipt.id} imageUrl={detail.receipt.imageUrl} />
              </section>
            )}
            <Button
              variant="outline"
              onClick={() => {
                onClose();
                onEdit(detail);
              }}
            >
              Edit transaction
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
