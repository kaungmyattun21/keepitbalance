import type { PantryItem } from "@keepitbalance/shared/groceries";
import { TextField } from "@/shared/components/form/TextField";
import { SelectField } from "@/shared/components/form/SelectField";
import { GroceryForm } from "../../../shared/components/GroceryForm.tsx";
import { useAdjustStockForm } from "../hooks/use-adjust-stock-form.ts";

export function AdjustStockForm({ item, onClose }: { item: PantryItem; onClose: () => void }) {
  const { form, error, handleSubmit } = useAdjustStockForm(item, onClose);
  return (
    <GroceryForm
      error={error}
      onSubmit={handleSubmit}
      pending={form.formState.isSubmitting}
      onCancel={onClose}
      submitLabel="Adjust stock"
    >
      <p className="text-sm text-muted-foreground">
        Current stock: {item.quantity} {item.ingredient.unit}
      </p>
      <div className="grid grid-cols-[minmax(0,1fr)_6rem] items-start gap-3 rounded-lg border p-3">
        <SelectField
          control={form.control}
          name="direction"
          label="Adjustment"
          placeholder="Choose an adjustment"
          options={[
            { value: "remove", label: "Use stock" },
            { value: "add", label: "Add stock" },
          ]}
        />
        <TextField
          control={form.control}
          name="quantity"
          label={`Quantity (${item.ingredient.unit})`}
          inputMode="decimal"
          placeholder="0.00"
        />
      </div>
    </GroceryForm>
  );
}
