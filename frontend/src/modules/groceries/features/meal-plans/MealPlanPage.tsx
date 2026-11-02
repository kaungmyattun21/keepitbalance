import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CalendarDays, ChevronLeft, ChevronRight, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";
import { usePlanningToday } from "./hooks/use-planning-today.ts";
import { shiftDay, type MealPlanEntry, type MealSlot } from "@keepitbalance/shared/meal-planning";
import { useCurrentUser } from "@/modules/auth";
import { DocumentTitle } from "@/shared/components/DocumentTitle";
import { Button } from "@/shared/components/ui/button";
import { formatCalendarDate } from "@/shared/lib/format";
import { GroceryDrawer } from "../../shared/components/GroceryDrawer.tsx";
import { ConfirmRemoval } from "../../shared/components/ConfirmRemoval.tsx";
import { useMealPlan, useRecipes } from "../../shared/planning-queries.ts";
import { useMealMutation } from "../../shared/use-planning-mutations.ts";
import { groceryError } from "../../shared/use-grocery-mutations.ts";
import { planningWeek } from "./planning-week.ts";
import { MealForm } from "./components/MealForm.tsx";
import { MealCalendar } from "./components/MealCalendar.tsx";
import { GenerationPreview } from "./components/GenerationPreview.tsx";

type Editor = { date: string; slot: MealSlot; meal?: MealPlanEntry };
export function MealPlanPage() {
  const user = useCurrentUser();
  const [params, setParams] = useSearchParams();
  const today = usePlanningToday(user.timezone ?? "UTC");
  const week = planningWeek(params, user.timezone ?? "UTC");
  const days = Array.from({ length: 7 }, (_, index) => shiftDay(week, index));
  const requestedDay = params.get("day");
  const selectedDay =
    requestedDay && days.includes(requestedDay) ? requestedDay : days.includes(today) ? today : week;
  const recipes = useRecipes();
  const meals = useMealPlan(week);
  const mutation = useMealMutation();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [removing, setRemoving] = useState<MealPlanEntry | null>(null);
  const [preview, setPreview] = useState(false);
  function showWeek(next: string) {
    setParams({ week: next }, { preventScrollReset: true });
  }
  async function toggle(meal: MealPlanEntry) {
    try {
      await mutation.mutateAsync({
        action: "eaten",
        id: meal.id,
        values: { eaten: !meal.eaten, updatedAt: meal.updatedAt },
      });
      setEditor(null);
    } catch (error) {
      toast.error(groceryError(error));
    }
  }
  return (
    <div className="@container/planner flex min-w-0 flex-col gap-5">
      <DocumentTitle title="Meal plan" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Previous week"
            onClick={() => showWeek(shiftDay(week, -7))}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <span className="text-sm font-medium">
            {formatCalendarDate(week)} – {formatCalendarDate(days[6]!)}
          </span>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Next week"
            onClick={() => showWeek(shiftDay(week, 7))}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setParams({}, { preventScrollReset: true })}>
            <CalendarDays aria-hidden />
            Today
          </Button>
          <Button
            size="sm"
            variant="outline"
            aria-label="Generate shopping list"
            onClick={() => setPreview(true)}
          >
            <ShoppingBasket aria-hidden />
            Shopping list
          </Button>
        </div>
      </div>
      {recipes.length === 0 && (
        <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
          Create a recipe before planning meals.{" "}
          <Link to="/meals/recipes" className="text-brand underline">
            Open recipes
          </Link>
        </p>
      )}
      <MealCalendar
        days={days}
        meals={meals}
        today={today}
        selectedDay={selectedDay}
        onSelectDay={(date) => setParams({ week, day: date }, { replace: true, preventScrollReset: true })}
        canAdd={recipes.length > 0}
        busy={mutation.isPending}
        onAdd={(date, slot) => setEditor({ date, slot })}
        onEdit={(meal) => setEditor({ date: meal.date, slot: meal.slot, meal })}
        onEaten={(meal) => void toggle(meal)}
        onRemove={setRemoving}
      />
      <GroceryDrawer
        open={editor !== null}
        title={editor?.meal ? "Edit planned meal" : "Add planned meal"}
        description="Choose a recipe and the servings you want to prepare."
        onClose={() => setEditor(null)}
      >
        {editor && (
          <MealForm
            key={editor.meal?.id ?? `${editor.date}-${editor.slot}`}
            {...editor}
            busy={mutation.isPending}
            onClose={() => setEditor(null)}
          />
        )}
      </GroceryDrawer>
      <GroceryDrawer
        open={preview}
        title="Shopping preview"
        description="Review your meal requirements before changing the shopping list."
        onClose={() => setPreview(false)}
      >
        {preview && <GenerationPreview week={week} onClose={() => setPreview(false)} />}
      </GroceryDrawer>
      <ConfirmRemoval
        open={removing !== null}
        title="Remove this planned meal?"
        description="The meal will leave your plan. Existing shopping items and pantry stock are preserved."
        onClose={() => setRemoving(null)}
        onConfirm={() =>
          removing ? mutation.mutateAsync({ action: "delete", id: removing.id }) : Promise.resolve()
        }
      />
    </div>
  );
}
