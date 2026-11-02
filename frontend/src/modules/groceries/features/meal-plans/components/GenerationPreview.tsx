import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { FormAlert } from "@/shared/components/form/FormAlert";
import { generationQuery } from "../../../shared/planning-queries.ts";
import { useGenerationMutation } from "../../../shared/use-planning-mutations.ts";
import { groceryError } from "../../../shared/use-grocery-mutations.ts";
export function GenerationPreview({ week, onClose }: { week: string; onClose: () => void }) {
  const query = useQuery(generationQuery(week));
  const apply = useGenerationMutation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const data = query.data;
  const additions = data?.rows.filter((row) => row.toAdd !== "0.00" && !row.blocked).length ?? 0;
  const otherWeek = data?.listWeekStart && data.listWeekStart !== week;
  async function save() {
    if (!data || query.isFetching || apply.isPending) return;
    setError(null);
    try {
      const result = await apply.mutateAsync({ weekStart: week, token: data.token });
      toast.success(
        `${result.addedCount} shopping items updated.${result.reviewCount ? ` ${result.reviewCount} items need manual review.` : ""}`,
      );
      onClose();
      if (result.data) await navigate("/meals");
    } catch (error) {
      setError(groceryError(error));
    }
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-6">
        <FormAlert message={error ?? (query.isError ? groceryError(query.error) : null)} />
        <Button
          variant="outline"
          size="sm"
          disabled={query.isFetching || apply.isPending}
          onClick={() => {
            setError(null);
            void query.refetch();
          }}
        >
          <RotateCcw aria-hidden />
          {query.isFetching ? "Refreshing…" : "Refresh preview"}
        </Button>
        {!data ? (
          <p role="status" className="text-sm text-muted-foreground">
            {query.isError ? "Refresh to try again." : "Calculating your shopping needs…"}
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {data.mealCount} remaining meals. Pantry stock and items already on your open list are deducted
              first.
            </p>
            <p className="flex items-start gap-2 rounded-xl bg-brand-subtle/40 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-brand" aria-hidden />
              Checked items, entered prices and manual items are preserved.
            </p>
            {otherWeek && (
              <p role="alert" className="text-sm text-destructive">
                Your open list belongs to the week of {data.listWeekStart}. Finish or delete it first.{" "}
                <Link to="/meals" onClick={onClose} className="underline">
                  Open shopping list
                </Link>
              </p>
            )}
            {!data.rows.length && (
              <p className="py-6 text-sm text-muted-foreground">No remaining meals to shop for this week.</p>
            )}
            <ul className="divide-y divide-border/60">
              {data.rows.map((row) => (
                <li key={row.ingredient.id} className="py-4">
                  <p className="font-medium wrap-anywhere">
                    {row.ingredient.name}{" "}
                    <span className="text-xs font-normal text-muted-foreground">({row.ingredient.unit})</span>
                  </p>
                  {!row.planned ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Already on your list · {row.onList} {row.ingredient.unit} kept
                    </p>
                  ) : (
                    <>
                      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                        {[
                          ["Required", row.required],
                          ["Pantry", row.inPantry],
                          ["On list", row.onList],
                          ["Shortfall", row.toAdd],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <dt className="text-muted-foreground">{label}</dt>
                            <dd className="mt-1 font-medium wrap-anywhere tabular-nums">{value}</dd>
                          </div>
                        ))}
                      </dl>
                      {row.blocked && (
                        <p className="mt-3 text-xs text-expense">
                          Review manually: this item is checked or has a price. Its quantity will stay
                          unchanged.
                        </p>
                      )}
                      {row.excess !== "0.00" && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          {row.excess} {row.ingredient.unit} extra on your list. Kept for review.
                        </p>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
            {additions === 0 && data.rows.length > 0 && (
              <p className="text-sm text-muted-foreground">
                No automatic additions needed. Review any flagged items above.
              </p>
            )}
          </>
        )}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-border/60 px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!data || query.isFetching || apply.isPending || Boolean(otherWeek) || additions === 0}
          onClick={() => void save()}
        >
          {apply.isPending ? "Adding…" : `Add ${additions} shortages`}
        </Button>
      </div>
    </div>
  );
}
