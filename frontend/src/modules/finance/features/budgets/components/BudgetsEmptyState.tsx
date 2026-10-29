import { PiggyBank } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export function BudgetsEmptyState({ onSetUp }: { onSetUp: () => void }) {
  return (
    <section
      aria-labelledby="budgets-empty-heading"
      className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-card/50 px-6 py-14 text-center"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-brand-subtle text-brand">
        <PiggyBank className="size-5" aria-hidden />
      </span>
      <div className="flex max-w-sm flex-col gap-1.5">
        <h2 id="budgets-empty-heading" className="font-heading text-lg font-semibold tracking-tight">
          No budgets yet
        </h2>
        <p className="text-sm text-muted-foreground">
          Set a monthly limit for the categories you want to keep an eye on.
        </p>
      </div>
      <Button onClick={onSetUp}>Set up budgets</Button>
    </section>
  );
}
