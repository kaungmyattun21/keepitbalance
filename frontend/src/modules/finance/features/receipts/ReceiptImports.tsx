import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronRight, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import type { Category } from "@keepitbalance/shared/finance";
import { receiptImageTypes } from "@keepitbalance/shared/receipts";
import { SectionCard } from "@/shared/components/SectionCard";
import { FormAlert } from "@/shared/components/form/FormAlert";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { formatMoney } from "@/shared/lib/format";
import { receiptsQuery, useUploadReceipt } from "./queries.ts";
import { ReceiptDialog } from "./components/ReceiptDialog.tsx";

const statusLabels = {
  queued: "Waiting",
  processing: "Processing",
  needs_review: "Review details",
  failed: "Needs attention",
  confirmed: "Recorded",
};

export function ReceiptImports({ categories }: { categories: Category[] }) {
  const inputId = useId();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const receipts = useQuery(receiptsQuery(page));
  const upload = useUploadReceipt();
  return (
    <SectionCard title="Receipts" description="Upload a receipt, review the details, and record an expense.">
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor={inputId} className="text-sm font-medium">
            Upload receipt
          </label>
          <Input
            id={inputId}
            type="file"
            accept={receiptImageTypes.join(",")}
            disabled={upload.isPending}
            aria-describedby={`${inputId}-help`}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file)
                upload.mutate(file, {
                  onSuccess: ({ data, duplicate }) => {
                    setSelected(data.id);
                    setPage(1);
                    if (duplicate)
                      toast.info("This receipt was already uploaded. Opening the existing receipt.");
                  },
                });
            }}
          />
          <p id={`${inputId}-help`} className="text-xs text-muted-foreground">
            JPEG, PNG or WebP · up to 5 MB. English and Thai text recognition; review all suggested values.
          </p>
          {upload.isPending && (
            <p role="status" className="text-sm text-muted-foreground">
              Uploading receipt…
            </p>
          )}
          <FormAlert message={upload.error?.message ?? null} />
        </div>
        {receipts.isError && (
          <div className="space-y-2">
            <FormAlert message="Couldn't load receipts." />
            <Button variant="outline" onClick={() => void receipts.refetch()}>
              Reload receipts
            </Button>
          </div>
        )}
        {!receipts.data && !receipts.isError && (
          <p role="status" className="text-sm text-muted-foreground">
            Loading receipts…
          </p>
        )}
        <div className="space-y-2">
          {receipts.data?.data.map((receipt) => (
            <button
              key={receipt.id}
              type="button"
              onClick={() => setSelected(receipt.id)}
              className="flex w-full items-center gap-3 rounded-xl bg-muted/35 p-3 text-left focus-visible:outline-2 focus-visible:outline-ring"
            >
              {receipt.status === "confirmed" ? (
                <Check className="size-5 shrink-0 text-brand" aria-hidden />
              ) : (
                <ReceiptText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {receipt.draft?.merchant ?? "Receipt upload"}
                </span>
                <span className="text-xs text-muted-foreground">{statusLabels[receipt.status]}</span>
              </span>
              {receipt.draft?.total && (
                <span className="text-sm tabular-nums">{formatMoney(receipt.draft.total)}</span>
              )}
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          ))}
        </div>
        {receipts.data && receipts.data.totalPages > 1 && (
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous receipts
            </Button>
            <span className="text-xs text-muted-foreground">
              {page} / {receipts.data.totalPages}
            </span>
            <Button
              variant="ghost"
              disabled={page >= receipts.data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next receipts
            </Button>
          </div>
        )}
        {selected && (
          <ReceiptDialog id={selected} categories={categories} onClose={() => setSelected(null)} />
        )}
      </div>
    </SectionCard>
  );
}
