import { useId } from "react";
import { Controller } from "react-hook-form";
import { FormAlert } from "@/shared/components/form/FormAlert";
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
    groups,
    rows,
    formError,
    monthlyTotal,
    selectedCount,
    selectRow,
    changeAmount,
    clearAmounts,
    handleSubmit,
  } = useBudgetForm(options);
  const { isSubmitting } = form.formState;

  return (
    <form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain p-6">
        <FormAlert message={formError} />

        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">You don't have any expense categories yet.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {groups.map((group) => (
              <fieldset key={group.id} className="min-w-0">
                <legend className="mb-2 w-full text-sm font-semibold">
                  {group.name} <span className="float-right tabular-nums">{formatMoney(group.total)}</span>
                </legend>
                {group.indices.length === 0 && (
                  <p className="text-sm text-muted-foreground">No categories in this group yet.</p>
                )}
                <ul className="divide-y">
                  {group.indices.map((index) => {
                    const field = fields[index]!;
                    const selected = rows[index]?.selected ?? false;
                    const checkboxId = `${idPrefix}-${field.categoryId}-selected`;
                    const errorId = `${idPrefix}-${field.categoryId}-error`;
                    return (
                      <li
                        key={field.id}
                        className="grid grid-cols-[minmax(0,1fr)_9.5rem] items-start gap-3 py-3"
                      >
                        <label
                          htmlFor={checkboxId}
                          className="flex min-h-9 cursor-pointer items-center gap-3"
                        >
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
              </fieldset>
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-4 border-t bg-popover px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {selectedCount === 0 ? (
            "No categories selected."
          ) : (
            <>
              Total budget{" "}
              <span className="font-semibold text-foreground tabular-nums">{formatMoney(monthlyTotal)}</span>{" "}
              per month across {selectedCount} {selectedCount === 1 ? "category" : "categories"}
            </>
          )}
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {mode === "edit" && (
            <Button
              type="button"
              variant="ghost"
              className="sm:mr-auto"
              onClick={clearAmounts}
              disabled={isSubmitting}
            >
              Clear all amounts
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onDismiss}>
            {mode === "setup" ? "Skip for now" : "Cancel"}
          </Button>
          <Button type="submit" className="sm:min-w-32" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save budgets"}
          </Button>
        </div>
      </div>
    </form>
  );
}
