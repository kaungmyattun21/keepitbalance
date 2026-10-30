import { SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import type { BudgetFormOptions } from "../types.ts";
import { BudgetForm } from "./BudgetForm.tsx";

type ManageBudgetsDrawerProps = BudgetFormOptions & {
  onDismiss: () => void;
};

export function ManageBudgetsDrawer({ onDismiss, ...options }: ManageBudgetsDrawerProps) {
  const mode = options.budgets.length > 0 ? "edit" : "setup";
  return (
    <SheetContent>
      <SheetHeader>
        <SheetTitle>{mode === "setup" ? "Set up your monthly budgets" : "Manage budgets"}</SheetTitle>
        <SheetDescription>
          Pick the expense categories you want to limit. Budgets repeat every month, and unspent money doesn't
          carry over. Clear an amount or uncheck its category to remove a budget when you save.
        </SheetDescription>
      </SheetHeader>
      <BudgetForm {...options} mode={mode} onDismiss={onDismiss} />
    </SheetContent>
  );
}
