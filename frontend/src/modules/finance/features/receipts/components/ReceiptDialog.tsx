import { useQuery } from "@tanstack/react-query";
import { Check, Clock, RotateCcw } from "lucide-react";
import type { Category } from "@keepitbalance/shared/finance";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { FormAlert } from "@/shared/components/form/FormAlert";
import { env } from "@/shared/lib/env";
import { receiptQuery, receiptPending, useReceiptAction } from "../queries.ts";
import { ReceiptReviewForm } from "./ReceiptReviewForm.tsx";

export function ReceiptDialog({
  id,
  categories,
  onClose,
}: {
  id: string;
  categories: Category[];
  onClose: () => void;
}) {
  const query = useQuery(receiptQuery(id));
  const retry = useReceiptAction(id);
  const receipt = query.data;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review receipt</DialogTitle>
          <DialogDescription>Check the details before recording your purchase.</DialogDescription>
        </DialogHeader>
        {query.isError && (
          <div className="space-y-3">
            <FormAlert message={query.error.message} />
            <Button variant="outline" onClick={() => void query.refetch()}>
              Try again
            </Button>
          </div>
        )}
        {!receipt && !query.isError && <p role="status">Loading receipt…</p>}
        {receipt && (
          <>
            <a
              href={`${env.apiBaseUrl}${receipt.imageUrl}`}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"
              aria-label="Open original receipt image"
            >
              <img
                src={`${env.apiBaseUrl}${receipt.imageUrl}`}
                crossOrigin="use-credentials"
                alt="Uploaded receipt"
                className="max-h-60 w-full rounded-xl object-contain"
              />
            </a>
            {receiptPending(receipt) && (
              <div role="status" className="flex gap-3 rounded-xl bg-muted/40 p-4 text-sm">
                <Clock className="size-5 shrink-0" aria-hidden />
                <div>
                  <p className="font-medium">
                    {receipt.status === "queued" ? "Waiting to process" : "Reading your receipt"}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    You can close this window and return to your receipt later.
                  </p>
                </div>
              </div>
            )}
            {receipt.status === "confirmed" && (
              <p
                role="status"
                className="flex items-center gap-2 rounded-xl bg-brand-subtle p-4 text-sm text-brand"
              >
                <Check className="size-5" aria-hidden />
                Purchase recorded. This receipt already has a transaction.
              </p>
            )}
            {receipt.status === "failed" && (
              <div className="space-y-3">
                <FormAlert message={receipt.error ?? "Processing failed."} />
                <FormAlert message={retry.error?.message ?? null} />
                <Button variant="outline" disabled={retry.isPending} onClick={() => retry.mutate("retry")}>
                  <RotateCcw aria-hidden />
                  {retry.isPending ? "Queuing…" : "Retry extraction"}
                </Button>
                <p className="text-sm text-muted-foreground">
                  You can also enter the purchase details below.
                </p>
              </div>
            )}
            {receipt.status === "needs_review" && (
              <div className="space-y-2">
                <FormAlert message={retry.error?.message ?? null} />
                <Button variant="outline" disabled={retry.isPending} onClick={() => retry.mutate("retry")}>
                  <RotateCcw aria-hidden />
                  {retry.isPending ? "Queuing…" : "Reprocess receipt"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Read the original image again. Any unsaved form edits will be replaced.
                </p>
              </div>
            )}
            {receipt.draft && ["needs_review", "failed"].includes(receipt.status) && (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {receipt.draft.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
            {["needs_review", "failed"].includes(receipt.status) && (
              <ReceiptReviewForm
                key={`${receipt.id}:${receipt.extractionVersion}:${receipt.status}`}
                receipt={receipt}
                categories={categories}
              />
            )}
            {receipt.rawText && !receiptPending(receipt) && (
              <details className="rounded-xl bg-muted/30 p-3 text-sm">
                <summary className="cursor-pointer font-medium">Extracted text</summary>
                <pre className="mt-3 max-h-60 overflow-auto text-xs whitespace-pre-wrap">
                  {receipt.rawText}
                </pre>
              </details>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
