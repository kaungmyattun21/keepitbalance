import { useId } from "react";
import { Controller } from "react-hook-form";
import { FormAlert } from "@/shared/components/form/FormAlert";
import { SectionCard } from "@/shared/components/SectionCard";
import { Button } from "@/shared/components/ui/button";
import { FieldError } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { formatMoney } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { useBudgetForm } from "../hooks/use-budget-form.ts";
import type { BudgetFormOptions } from "../types.ts";

type BudgetFormProps = BudgetFormOptions & {
  mode: "setup" | "edit";
  onDismiss: () => void;
};

export function BudgetForm({ mode, onDismiss, ...options }: BudgetFormProps) {
  const idPrefix = useId();
  const {
    form,
    fields,
    rows,
    formError,
    monthlyTotal,
    selectedCount,
    selectRow,
    changeAmount,
    handleSubmit,
  } = useBudgetForm(options);
  const { isSubmitting } = form.formState;

  return (
    <SectionCard
      title={mode === "setup" ? "Set up your monthly budgets" : "Edit budgets"}
      description="Pick the expense categories you want to limit. Budgets repeat every month, and unspent money doesn't carry over."
    >
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
        <FormAlert message={formError} />

        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">You don't have any expense categories yet.</p>
        ) : (
          <ul className="-my-3 divide-y">
            {fields.map((field, index) => {
              const selected = rows[index]?.selected ?? false;
              const checkboxId = `${idPrefix}-${field.categoryId}-selected`;
              const errorId = `${idPrefix}-${field.categoryId}-error`;
              return (
                <li key={field.id} className="grid grid-cols-[minmax(0,1fr)_9.5rem] items-start gap-3 py-3">
                  <label htmlFor={checkboxId} className="flex min-h-9 cursor-pointer items-center gap-3">
                    <input
                      id={checkboxId}
                      type="checkbox"
                      className="size-4 shrink-0 cursor-pointer accent-brand"
                      checked={selected}
                      onChange={(event) => selectRow(index, event.target.checked)}
                    />
                    <span className={cn("truncate font-medium", !selected && "text-muted-foreground")}>
                      {field.categoryName}
                    </span>
                  </label>
                  <Controller
                    control={form.control}
                    name={`rows.${index}.amount`}
                    render={({ field: amountField, fieldState }) => (
                      <div className="flex flex-col gap-1.5">
                        <Input
                          {...amountField}
                          onChange={(event) => changeAmount(index, event.target.value)}
                          inputMode="decimal"
                          placeholder="0.00"
                          aria-label={`Monthly budget for ${field.categoryName}`}
                          aria-invalid={fieldState.invalid}
                          aria-describedby={fieldState.invalid ? errorId : undefined}
                          className={cn("text-right tabular-nums", !selected && "opacity-60")}
                        />
                        <FieldError id={errorId} errors={[fieldState.error]} />
                      </div>
                    )}
                  />
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {selectedCount === 0 ? (
              "No categories selected."
            ) : (
              <>
                Total budget{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {formatMoney(monthlyTotal)}
                </span>{" "}
                per month across {selectedCount} {selectedCount === 1 ? "category" : "categories"}
              </>
            )}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onDismiss}>
              {mode === "setup" ? "Skip for now" : "Cancel"}
            </Button>
            <Button type="submit" className="sm:min-w-32" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save budgets"}
            </Button>
          </div>
        </div>
      </form>
    </SectionCard>
  );
}
