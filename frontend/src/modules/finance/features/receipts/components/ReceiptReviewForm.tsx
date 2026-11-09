import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  confirmReceiptSchema,
  type ConfirmReceiptInput,
  type ConfirmReceiptValues,
  type Receipt,
} from "@keepitbalance/shared/receipts";
import type { Category } from "@keepitbalance/shared/finance";
import { toast } from "sonner";
import { FieldIdScope } from "@/shared/components/form/FieldIdScope";
import { FormAlert } from "@/shared/components/form/FormAlert";
import { TextField } from "@/shared/components/form/TextField";
import { TextareaField } from "@/shared/components/form/TextareaField";
import { SelectField } from "@/shared/components/form/SelectField";
import { Button } from "@/shared/components/ui/button";
import { CategoryIcon } from "../../../shared/components/CategoryIcon.tsx";
import { useReceiptAction } from "../queries.ts";

export function ReceiptReviewForm({ receipt, categories }: { receipt: Receipt; categories: Category[] }) {
  const action = useReceiptAction(receipt.id);
  const form = useForm<ConfirmReceiptInput, unknown, ConfirmReceiptValues>({
    resolver: zodResolver(confirmReceiptSchema),
    defaultValues: {
      merchant: receipt.draft?.merchant ?? "",
      date: receipt.draft?.date ?? "",
      amount: receipt.draft?.total ?? "",
      categoryId: "",
      note: "",
    },
  });
  return (
    <FieldIdScope>
      <form
        noValidate
        className="space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await action.mutateAsync(values);
            toast.success("Receipt purchase recorded.");
          } catch {
            /* Mutation error is shown below. */
          }
        })}
      >
        <FormAlert message={action.error?.message ?? null} />
        <fieldset disabled={action.isPending} className="space-y-4">
          <TextField control={form.control} name="merchant" label="Merchant" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              control={form.control}
              name="amount"
              label="Purchase total"
              inputMode="decimal"
              placeholder="0.00"
            />
            <TextField control={form.control} name="date" label="Purchase date" type="date" />
          </div>
          <SelectField
            control={form.control}
            name="categoryId"
            label="Expense category"
            placeholder="Choose a category"
            options={categories
              .filter((category) => category.type === "expense")
              .map((category) => ({
                value: category.id,
                label: category.name,
                icon: <CategoryIcon icon={category.icon} className="size-6 rounded-lg" />,
              }))}
          />
          <TextareaField
            control={form.control}
            name="note"
            label="Note"
            description="Optional. If blank, the merchant is used as the transaction note."
          />
          <p className="text-xs text-muted-foreground">
            This saves one expense. Spending appears in the budget for its category and purchase month.
          </p>
          <Button type="submit" className="w-full" disabled={action.isPending}>
            {action.isPending ? "Saving purchase…" : "Save purchase"}
          </Button>
        </fieldset>
      </form>
    </FieldIdScope>
  );
}
