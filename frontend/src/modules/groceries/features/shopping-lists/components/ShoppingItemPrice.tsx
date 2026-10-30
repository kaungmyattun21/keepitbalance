import { useId } from "react";
import type { ShoppingItem } from "@keepitbalance/shared/groceries";
import { Input } from "@/shared/components/ui/input";
import { useShoppingPriceForm } from "../hooks/use-shopping-price-form.ts";

export function ShoppingItemPrice({
  listId,
  item,
  disabled,
}: {
  listId: string;
  item: ShoppingItem;
  disabled: boolean;
}) {
  const id = useId();
  const { form, save, pending } = useShoppingPriceForm(listId, item, disabled);
  const error = form.formState.errors.price?.message ?? form.formState.errors.root?.message;
  const field = form.register("price");
  return (
    <form noValidate aria-label={`Price for ${item.ingredient.name}`} className="w-28" onSubmit={save}>
      <label htmlFor={id} className="mb-1 block text-xs text-muted-foreground">
        Total price
        <span className="sr-only"> for {item.ingredient.name}</span>
      </label>
      <Input
        {...field}
        id={id}
        inputMode="decimal"
        aria-label={`Total price for ${item.ingredient.name}`}
        placeholder="Not entered"
        disabled={disabled}
        readOnly={pending}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : `${id}-hint`}
        onBlur={(event) => {
          void field.onBlur(event);
          void save();
        }}
      />
      <span id={`${id}-hint`} className="sr-only">
        Total for this quantity. Saves on blur or Enter.
      </span>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
