import { shoppingTotals } from "@keepitbalance/shared/groceries";
import { formatMoney } from "@/shared/lib/format";
import type { ShoppingList } from "@keepitbalance/shared/groceries";
import { TextField } from "@/shared/components/form/TextField";
import { SelectField } from "@/shared/components/form/SelectField";
import { GroceryForm } from "../../../shared/components/GroceryForm.tsx";
import { useCheckoutForm } from "../hooks/use-checkout-form.ts";

export function CheckoutForm({
  list,
  categoryId,
  onClose,
}: {
  list: ShoppingList;
  categoryId: string | null;
  onClose: () => void;
}) {
  const { form, error, categoryOptions, handleSubmit } = useCheckoutForm(list, categoryId, onClose);
  const totals = shoppingTotals(list.items);
  const bought = list.items.filter((item) => item.checked);
  return (
    <GroceryForm
      error={error}
      onSubmit={handleSubmit}
      pending={form.formState.isSubmitting}
      onCancel={onClose}
      submitLabel="Complete shopping"
    >
      <div>
        <p className="mb-2 font-medium">Purchased items ({bought.length})</p>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {bought.map((item) => (
            <li key={item.id}>
              {item.ingredient.name}: {item.quantity} {item.ingredient.unit}
              {item.price !== null && ` · ${formatMoney(item.price)}`}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm font-medium">Item total: {formatMoney(totals.amount)}</p>
        {totals.missingPrices > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            {totals.missingPrices} purchased items have no price. Enter the full receipt total below.
          </p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Only checked items are added to your pantry. Unchecked items stay in this list's history.
        </p>
      </div>
      <TextField
        control={form.control}
        name="amount"
        label="Total cost"
        inputMode="decimal"
        placeholder="0.00"
        description="Adjust to match your receipt, including discounts, tax or bags."
      />
      <TextField control={form.control} name="date" label="Purchase date" type="date" />
      <SelectField
        control={form.control}
        name="categoryId"
        label="Expense category"
        placeholder="Choose a category"
        options={categoryOptions}
        description="This expense counts toward the matching category budget for the purchase month. Your choice is remembered for next time."
      />
    </GroceryForm>
  );
}
