import { FieldIdScope } from "@/shared/components/form/FieldIdScope";
import { FormAlert } from "@/shared/components/form/FormAlert";
import { TextField } from "@/shared/components/form/TextField";
import { SelectField } from "@/shared/components/form/SelectField";
import { Button } from "@/shared/components/ui/button";
import { FieldGroup } from "@/shared/components/ui/field";
import type { BillFormOptions } from "../types.ts";
import { useBillForm } from "../hooks/use-bill-form.ts";

export function BillForm({ onCancel, ...options }: BillFormOptions & { onCancel: () => void }) {
  const { form, formError, categoryOptions, handleSubmit } = useBillForm(options);
  return (
    <FieldIdScope>
      <form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto overscroll-contain p-6">
          <FormAlert message={formError} />
          <FieldGroup>
            <TextField control={form.control} name="name" label="Bill name" placeholder="e.g. Electricity" />
            <TextField
              control={form.control}
              name="amount"
              label="Expected amount"
              inputMode="decimal"
              placeholder="0.00"
            />
            <SelectField
              control={form.control}
              name="categoryId"
              label="Expense category"
              placeholder="Choose a category"
              options={categoryOptions}
            />
            <SelectField
              control={form.control}
              name="frequency"
              label="Repeats"
              placeholder="Choose a schedule"
              options={[
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
                { value: "yearly", label: "Yearly" },
              ]}
            />
            <TextField
              control={form.control}
              name="nextDueDate"
              label="Next due date"
              type="date"
              description="Short months use the last day, then return to your original day. Changing the due date or repeat schedule starts a new schedule."
            />
          </FieldGroup>
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : "Save bill"}
          </Button>
        </div>
      </form>
    </FieldIdScope>
  );
}
