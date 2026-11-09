import { ArrowUpRight, CalendarDays, ChefHat, Flame, Leaf, Pencil, Trash2, Users } from "lucide-react";
import type { Recipe } from "@keepitbalance/shared/meal-planning";
import { Button } from "@/shared/components/ui/button";
import { env } from "@/shared/lib/env";

export function RecipeCard({
  recipe,
  onView,
  onEdit,
  onDelete,
}: {
  recipe: Recipe;
  onView: (recipe: Recipe) => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
}) {
  return (
    <article className="relative h-full min-w-0 overflow-hidden rounded-3xl bg-background/70">
      <button
        type="button"
        aria-label={`View ${recipe.name}`}
        onClick={() => onView(recipe)}
        className="flex h-full w-full min-w-0 flex-col p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span className="relative block aspect-video w-full shrink-0 overflow-hidden rounded-2xl bg-muted/30">
          {recipe.imageUrl ? (
            <img
              src={`${env.apiBaseUrl}${recipe.imageUrl}`}
              crossOrigin="use-credentials"
              loading="lazy"
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center overflow-hidden bg-linear-to-br from-emerald-100/70 via-brand-subtle/70 to-sky-100/60 dark:from-emerald-400/10 dark:via-muted/70 dark:to-sky-400/10">
              <Leaf
                className="absolute -top-3 -left-3 size-28 -rotate-12 text-brand/10"
                strokeWidth={1}
                aria-hidden
              />
              <span className="grid size-20 place-items-center rounded-3xl bg-card/70 text-brand">
                <ChefHat className="size-10" strokeWidth={1.25} aria-hidden />
              </span>
              <Leaf
                className="absolute -right-4 -bottom-6 size-32 rotate-45 text-brand/10"
                strokeWidth={1}
                aria-hidden
              />
            </span>
          )}
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1.5 text-xs font-medium text-card-foreground">
            <Leaf className="size-3.5 text-brand" aria-hidden />
            {recipe.ingredients.length} {recipe.ingredients.length === 1 ? "ingredient" : "ingredients"}
          </span>
        </span>
        <span className="flex w-full min-w-0 flex-1 flex-col px-1 pt-4 pb-1 sm:px-2 sm:pt-5 sm:pb-2">
          <span
            title={recipe.name}
            className="line-clamp-2 min-h-14 text-lg leading-7 font-semibold tracking-tight wrap-anywhere"
          >
            {recipe.name}
          </span>
          <span className="mt-3 grid grid-cols-2 gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-subtle/60 text-brand">
                <Users className="size-3.5" aria-hidden />
              </span>
              <span className="min-w-0 text-xs leading-5 text-muted-foreground">
                <span className="block font-medium text-foreground">
                  {recipe.servings} {recipe.servings === 1 ? "serving" : "servings"}
                </span>
                Per recipe
              </span>
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300">
                <Flame className="size-3.5" aria-hidden />
              </span>
              <span className="min-w-0 text-xs leading-5 text-muted-foreground">
                <span className="block font-medium wrap-anywhere text-foreground">
                  {recipe.caloriesPerServing > 0 ? `${recipe.caloriesPerServing} kcal` : "Not set"}
                </span>
                {recipe.caloriesPerServing > 0 ? "Per serving" : "Calories"}
              </span>
            </span>
          </span>
          <span className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand">
              View recipe <ArrowUpRight className="size-3.5" aria-hidden />
            </span>
            {recipe.inUse && (
              <span className="inline-flex items-center gap-1 text-[0.6875rem] text-muted-foreground">
                <CalendarDays className="size-3" aria-hidden />
                In your plan
              </span>
            )}
          </span>
        </span>
      </button>
      <div className="absolute top-6 right-6 flex gap-1 rounded-2xl bg-card/95 p-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-10 rounded-xl text-muted-foreground hover:text-foreground"
          aria-label={`Edit ${recipe.name}`}
          onClick={() => onEdit(recipe)}
        >
          <Pencil className="size-4" aria-hidden />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-10 rounded-xl text-muted-foreground hover:text-destructive"
          disabled={recipe.inUse}
          title={recipe.inUse ? "Used by a meal plan" : "Delete recipe"}
          aria-label={`Delete ${recipe.name}`}
          onClick={() => onDelete(recipe)}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>
    </article>
  );
}
