import { Check, Plus, Trash2 } from "lucide-react";
import type { MealPlanEntry, MealSlot } from "@keepitbalance/shared/meal-planning";
import { Button } from "@/shared/components/ui/button";
import { env } from "@/shared/lib/env";
import { cn } from "@/shared/lib/utils";

export type MealSlotActions = {
  busy: boolean;
  canAdd: boolean;
  onAdd: (date: string, slot: MealSlot) => void;
  onEdit: (meal: MealPlanEntry) => void;
  onEaten: (meal: MealPlanEntry) => void;
  onRemove: (meal: MealPlanEntry) => void;
};

export function MealSlotCard({
  date,
  slot,
  meals,
  busy,
  canAdd,
  onAdd,
  onEdit,
  onEaten,
  onRemove,
}: MealSlotActions & { date: string; slot: MealSlot; meals: MealPlanEntry[] }) {
  return (
    <section aria-label={`${slot} on ${date}`} className="group/slot flex min-h-20 min-w-0 flex-col gap-1">
      {meals.length > 0 && (
        <ul className="space-y-1">
          {meals.map((meal) => (
            <li key={meal.id}>
              <button
                type="button"
                aria-label={`Edit meal ${meal.recipe.name}`}
                aria-disabled={busy}
                onClick={() => !busy && onEdit(meal)}
                className="flex min-h-14 w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {meal.recipe.imageUrl && (
                  <img
                    src={`${env.apiBaseUrl}${meal.recipe.imageUrl}`}
                    crossOrigin="use-credentials"
                    loading="lazy"
                    alt={meal.recipe.name}
                    width={64}
                    height={64}
                    className="size-16 shrink-0 rounded-xl object-cover"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-sm font-medium wrap-anywhere",
                      meal.eaten && "text-muted-foreground",
                    )}
                  >
                    {meal.recipe.name}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {meal.servings} {meal.servings === 1 ? "serving" : "servings"}
                  </span>
                </span>
              </button>
              <div className="flex items-center justify-between gap-2 px-2 pb-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-disabled={busy}
                  aria-pressed={meal.eaten}
                  aria-label={`Mark ${meal.recipe.name} as ${meal.eaten ? "planned" : "eaten"}`}
                  className={cn(
                    "h-9 gap-1.5 px-2 text-xs",
                    meal.eaten ? "bg-brand-subtle text-brand hover:text-brand" : "text-muted-foreground",
                  )}
                  onClick={() => !busy && onEaten(meal)}
                >
                  <Check className="size-3.5" aria-hidden />
                  {meal.eaten ? "Eaten" : "Mark eaten"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-disabled={busy}
                  aria-label={`Delete meal ${meal.recipe.name}`}
                  title="Delete meal"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => !busy && onRemove(meal)}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn(
          "rounded-lg text-muted-foreground/60 hover:text-brand",
          meals.length === 0
            ? "my-auto"
            : "opacity-60 group-hover/slot:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100",
        )}
        disabled={!canAdd || busy}
        aria-label={`Add ${slot} for ${date}`}
        onClick={() => onAdd(date, slot)}
      >
        <Plus className="size-4" aria-hidden />
      </Button>
    </section>
  );
}
