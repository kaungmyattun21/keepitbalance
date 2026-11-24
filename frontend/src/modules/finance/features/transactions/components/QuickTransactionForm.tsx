import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Delete, Plus, RotateCcw } from "lucide-react";
import { Link } from "react-router";
import type { Category } from "@keepitbalance/shared/finance";
import { todayIn } from "@keepitbalance/shared/dates";
import { useCurrentUser } from "@/modules/auth";
import { FieldIdScope } from "@/shared/components/form/FieldIdScope";
import { FormAlert } from "@/shared/components/form/FormAlert";
import { SelectField } from "@/shared/components/form/SelectField";
import { TextField } from "@/shared/components/form/TextField";
import { Button } from "@/shared/components/ui/button";
import { FieldError } from "@/shared/components/ui/field";
import { cn } from "@/shared/lib/utils";
import { categoryGroupsQuery } from "../../../shared/hooks/use-category-groups.ts";
import { useQuickTransactionForm } from "../hooks/use-quick-transaction-form.ts";
import { TransactionTypeField } from "./TransactionTypeField.tsx";
import { TransactionReceiptField } from "../../receipts/components/TransactionReceiptField.tsx";
import { VoiceEntryButton } from "../../voice-entry/components/VoiceEntryButton.tsx";

function EntryForm({ categories, onSaved }: { categories: Category[]; onSaved: () => void }) {
  const user = useCurrentUser();
  const [noteOpen, setNoteOpen] = useState(false);
  const [keypadOpen, setKeypadOpen] = useState(true);
  const {
    form,
    formError,
    amount,
    pending,
    selectedType,
    categoryOptions,
    changeType,
    pressKey,
    handleAmountKey,
    handleSubmit,
    receiptId,
    selectReceipt,
    applyReceiptDraft,
    applyVoiceEntry,
    setReceiptUploading,
  } = useQuickTransactionForm({
    categories,
    today: todayIn(user.timezone ?? "UTC"),
    onSaved,
  });
  const income = selectedType === "income";
  return (
    <FieldIdScope>
      <form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <fieldset
          disabled={pending}
          onFocusCapture={(event) => {
            // Let date and note fields use the system keyboard without a second keypad.
            if (event.target instanceof HTMLInputElement) setKeypadOpen(event.target.readOnly);
          }}
          className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4"
        >
          <FormAlert message={formError} />
          <div className="[&_[data-slot=field-legend]]:sr-only">
            <TransactionTypeField value={selectedType} onChange={changeType} disabled={pending} />
          </div>
          <div className="relative my-5 text-center">
            <label htmlFor="quick-transaction-amount" className="text-xs text-muted-foreground">
              Amount
            </label>
            <input
              {...form.register("amount")}
              id="quick-transaction-amount"
              value={amount}
              readOnly
              inputMode="none"
              placeholder="0"
              onKeyDown={handleAmountKey}
              aria-invalid={Boolean(form.formState.errors.amount)}
              aria-describedby={form.formState.errors.amount ? "quick-transaction-amount-error" : undefined}
              className={cn(
                "mt-1 block h-16 w-full min-w-0 rounded-xl bg-transparent px-2 text-center text-[clamp(1.75rem,9vw,3rem)] font-medium tracking-tight tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring",
                income ? "text-brand placeholder:text-brand/40" : "text-expense placeholder:text-expense/40",
              )}
            />
            <FieldError id="quick-transaction-amount-error" errors={[form.formState.errors.amount]} />
          </div>
          <div className="grid min-w-0 gap-4">
            <VoiceEntryButton
              disabled={pending}
              onTranscript={(text) => {
                if (applyVoiceEntry(text).note) setNoteOpen(true);
              }}
            />
            <TransactionReceiptField
              receiptId={receiptId}
              disabled={pending}
              onSelect={selectReceipt}
              onApply={(draft) => {
                applyReceiptDraft(draft);
                if (draft.merchant) setNoteOpen(true);
              }}
              onUploadingChange={setReceiptUploading}
            />
            <SelectField
              control={form.control}
              name="categoryId"
              label="Category"
              placeholder="Choose a category"
              options={categoryOptions}
              disabled={pending}
            />
            {categoryOptions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No categories for this type.{" "}
                <Link className="text-brand underline" to="/finance/categories" onClick={onSaved}>
                  Manage categories
                </Link>
              </p>
            )}
            <TextField control={form.control} name="date" label="Date" type="date" />
            {noteOpen ? (
              <TextField control={form.control} name="note" label="Note" placeholder="What was it for?" />
            ) : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="justify-self-start text-muted-foreground"
                onClick={() => setNoteOpen(true)}
              >
                <Plus className="size-3.5" aria-hidden />
                Add note
              </Button>
            )}
          </div>
        </fieldset>
        <div className="shrink-0 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {keypadOpen ? (
            <div role="group" aria-label="Amount keypad" className="mb-3 grid grid-cols-3 gap-1.5">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "Backspace"].map((key) => (
                <Button
                  key={key}
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  aria-label={key === "." ? "Decimal point" : key === "Backspace" ? "Delete last digit" : key}
                  className="h-11 rounded-xl bg-muted/35 text-xl font-normal tabular-nums hover:bg-muted sm:h-12"
                  onClick={() => pressKey(key)}
                >
                  {key === "Backspace" ? <Delete className="size-5" aria-hidden /> : key}
                </Button>
              ))}
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              className="mb-2 w-full text-muted-foreground"
              onClick={() => {
                setKeypadOpen(true);
                form.setFocus("amount");
              }}
            >
              Show keypad
            </Button>
          )}
          <Button type="submit" disabled={pending} className="h-12 w-full">
            {pending ? "Saving…" : income ? "Save income" : "Save expense"}
          </Button>
        </div>
      </form>
    </FieldIdScope>
  );
}

export default function QuickTransactionForm({ onSaved }: { onSaved: () => void }) {
  const groups = useQuery(categoryGroupsQuery);
  if (!groups.data) {
    return groups.isError ? (
      <div className="space-y-4 p-6">
        <p role="alert" className="text-sm text-destructive">
          Couldn't load categories. Please try again.
        </p>
        <Button variant="outline" onClick={() => void groups.refetch()}>
          <RotateCcw aria-hidden />
          Retry
        </Button>
      </div>
    ) : (
      <p role="status" className="p-6 text-sm text-muted-foreground">
        Loading categories…
      </p>
    );
  }
  return <EntryForm categories={groups.data.flatMap((group) => group.categories)} onSaved={onSaved} />;
}
