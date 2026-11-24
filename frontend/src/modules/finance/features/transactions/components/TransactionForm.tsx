import { NOTE_MAX_LENGTH } from "@keepitbalance/shared/finance";
import { FieldIdScope } from "@/shared/components/form/FieldIdScope";
import { FormAlert } from "@/shared/components/form/FormAlert";
import { SelectField } from "@/shared/components/form/SelectField";
import { TextareaField } from "@/shared/components/form/TextareaField";
import { TextField } from "@/shared/components/form/TextField";
import { Button } from "@/shared/components/ui/button";
import { FieldGroup } from "@/shared/components/ui/field";
import { useTransactionForm } from "../hooks/use-transaction-form.ts";
import type { TransactionFormOptions } from "../types.ts";
import { TransactionTypeField } from "./TransactionTypeField.tsx";
import { TransactionReceiptField } from "../../receipts/components/TransactionReceiptField.tsx";

type TransactionFormProps = TransactionFormOptions & {
  onCancel?: () => void;
};

export function TransactionForm({ onCancel, ...options }: TransactionFormProps) {
  const {
    form,
    formError,
    isEditing,
    isShoppingExpense,
    selectedType,
    categoryOptions,
    changeType,
    handleSubmit,
    receiptId,
    receiptUploading,
    setReceiptUploading,
    selectReceipt,
    applyReceiptDraft,
  } = useTransactionForm(options);
  const { isSubmitting } = form.formState;
  const submitLabel = isEditing ? "Save changes" : "Add transaction";
  const pendingLabel = isEditing ? "Saving…" : "Adding…";

  return (
    <FieldIdScope>
      <form noValidate onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-6">
        <FormAlert message={formError} />

        <FieldGroup>
          <TransactionTypeField value={selectedType} onChange={changeType} disabled={isShoppingExpense} />
          <TransactionReceiptField
            receiptId={receiptId}
            transactionId={options.transaction?.id}
            locked={Boolean(options.transaction?.receipt)}
            disabled={isSubmitting}
            onSelect={selectReceipt}
            onApply={applyReceiptDraft}
            onUploadingChange={setReceiptUploading}
          />

          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 @md/field-group:grid-cols-2">
            <TextField
              control={form.control}
              name="amount"
              label="Amount"
              inputMode="decimal"
              placeholder="0.00"
            />
            <TextField control={form.control} name="date" label="Date" type="date" />
          </div>

          <SelectField
            control={form.control}
            name="categoryId"
            label="Category"
            placeholder="Choose a category"
            options={categoryOptions}
            disabled={isShoppingExpense}
            description={isShoppingExpense ? "Shopping expenses keep their type and category." : undefined}
          />

          <TextareaField
            control={form.control}
            name="note"
            label="Note"
            maxLength={NOTE_MAX_LENGTH}
            description={`Optional, up to ${NOTE_MAX_LENGTH} characters.`}
          />

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" className="sm:min-w-36" disabled={isSubmitting || receiptUploading}>
              {isSubmitting ? pendingLabel : submitLabel}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </FieldIdScope>
  );
}
