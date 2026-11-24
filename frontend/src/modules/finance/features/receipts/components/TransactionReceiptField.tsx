import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Paperclip, RotateCcw, ScanLine, X } from "lucide-react";
import type { ReceiptDraft } from "@keepitbalance/shared/receipts";
import { receiptImageTypes } from "@keepitbalance/shared/receipts";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { FormAlert } from "@/shared/components/form/FormAlert";
import { formatCalendarDate } from "@/shared/lib/format";
import {
  receiptPending,
  receiptQuery,
  receiptsQuery,
  useRetryReceipt,
  useUploadReceipt,
} from "../queries.ts";
import { ReceiptImage } from "./ReceiptImage.tsx";

type Props = {
  receiptId?: string;
  transactionId?: string;
  disabled: boolean;
  onSelect: (id: string | undefined) => void;
  onApply: (draft: ReceiptDraft) => void;
  onUploadingChange: (uploading: boolean) => void;
  locked?: boolean;
};

export function TransactionReceiptField({
  receiptId,
  transactionId,
  disabled,
  onSelect,
  onApply,
  onUploadingChange,
  locked = false,
}: Props) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [resumePage, setResumePage] = useState(1);
  const [showEarlier, setShowEarlier] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const upload = useUploadReceipt();
  const query = useQuery({ ...receiptQuery(receiptId ?? ""), enabled: Boolean(receiptId) });
  const earlier = useQuery({ ...receiptsQuery(resumePage), enabled: showEarlier && !receiptId });
  const retry = useRetryReceipt(receiptId ?? "");
  const receipt = query.data;
  const attached = locked || (receipt?.status === "confirmed" && receipt.transactionId === transactionId);
  const usedElsewhere = receipt?.status === "confirmed" && !attached;
  const busy = disabled || upload.isPending || retry.isPending;
  return (
    <div className="space-y-3 rounded-xl bg-muted/25 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Paperclip className="size-4" aria-hidden />
          Receipt <span className="font-normal text-muted-foreground">(optional)</span>
        </span>
        {!receiptId && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Hide" : "Add receipt"}
          </Button>
        )}
        {receiptId && !attached && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={busy}
            aria-label="Remove receipt from form"
            onClick={() => {
              onSelect(undefined);
              setSelectionError(null);
            }}
          >
            <X aria-hidden />
          </Button>
        )}
      </div>
      <FormAlert message={selectionError ?? upload.error?.message ?? retry.error?.message ?? null} />
      {!receiptId && expanded && (
        <div className="space-y-3">
          <label htmlFor={id} className="sr-only">
            Upload receipt
          </label>
          <Input
            id={id}
            type="file"
            accept={receiptImageTypes.join(",")}
            disabled={busy}
            aria-describedby={`${id}-help`}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setSelectionError(null);
              onUploadingChange(true);
              upload.mutate(file, {
                onSuccess: ({ data }) => {
                  if (data.status === "confirmed" && data.transactionId !== transactionId)
                    setSelectionError(
                      "This receipt is already attached to another transaction. Open that transaction to view it.",
                    );
                  else onSelect(data.id);
                },
                onSettled: () => onUploadingChange(false),
              });
            }}
          />
          <p id={`${id}-help`} className="text-xs text-muted-foreground">
            JPEG, PNG or WebP · up to 5 MB. Scan to suggest details, or enter them yourself.
          </p>
          {upload.isPending && (
            <p role="status" className="text-sm text-muted-foreground">
              Uploading receipt…
            </p>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => setShowEarlier(!showEarlier)}
          >
            Continue an earlier receipt
          </Button>
          {showEarlier && (
            <div className="space-y-2">
              {earlier.isPending && (
                <p role="status" className="text-xs text-muted-foreground">
                  Loading earlier receipts…
                </p>
              )}
              {earlier.isError && (
                <div>
                  <FormAlert message="Couldn't load earlier receipts." />
                  <Button type="button" size="sm" variant="ghost" onClick={() => void earlier.refetch()}>
                    Try again
                  </Button>
                </div>
              )}
              {earlier.data?.data.length === 0 && (
                <p className="text-xs text-muted-foreground">No unfinished receipts.</p>
              )}
              {earlier.data?.data.map((entry) => (
                <Button
                  key={entry.id}
                  type="button"
                  variant="ghost"
                  className="h-auto w-full justify-start whitespace-normal"
                  disabled={busy}
                  onClick={() => onSelect(entry.id)}
                >
                  {entry.draft?.merchant ?? "Receipt"} · {formatCalendarDate(entry.createdAt.slice(0, 10))}
                </Button>
              ))}
              {earlier.data && earlier.data.totalPages > 1 && (
                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={resumePage <= 1}
                    onClick={() => setResumePage(resumePage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={resumePage >= earlier.data.totalPages}
                    onClick={() => setResumePage(resumePage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {receiptId && (
        <>
          {!receipt && !query.isError && (
            <p role="status" className="text-sm text-muted-foreground">
              Loading receipt…
            </p>
          )}
          {query.isError && (
            <div>
              <FormAlert message={query.error.message} />
              <Button type="button" variant="ghost" size="sm" onClick={() => void query.refetch()}>
                Reload receipt
              </Button>
            </div>
          )}
          {receipt && (
            <>
              <ReceiptImage key={receipt.id} imageUrl={receipt.imageUrl} />
              {receiptPending(receipt) && (
                <p role="status" className="text-sm text-muted-foreground">
                  Scanning receipt… You can enter the transaction details and save now.
                </p>
              )}
              {usedElsewhere && (
                <FormAlert message="This receipt has already been saved to another transaction. Remove it or open the existing transaction." />
              )}
              {!attached && !usedElsewhere && !receiptPending(receipt) && (
                <div className="space-y-2">
                  {receipt.status === "failed" && (
                    <p className="text-sm text-muted-foreground">
                      Scanning failed. You can still save this receipt with manually entered details.
                    </p>
                  )}
                  {receipt.draft && (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        onClick={() => onApply(receipt.draft!)}
                      >
                        <ScanLine aria-hidden />
                        Use scanned details
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Applies the scanned amount, date and merchant as the note when available. Review
                        before saving.
                      </p>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {receipt.draft.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => retry.mutate()}
                  >
                    <RotateCcw aria-hidden />
                    {retry.isPending ? "Queuing…" : receipt.status === "failed" ? "Retry scan" : "Scan again"}
                  </Button>
                </div>
              )}
              {receipt.rawText && !receiptPending(receipt) && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Extracted text</summary>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap">{receipt.rawText}</pre>
                </details>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
