import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CalendarDays, ChevronLeft, ChevronRight, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";
import { usePlanningToday } from "./hooks/use-planning-today.ts";
import {
  mondayOf,
  shiftDay,
  resolvePlanningPeriod,
  planningPeriodSchema,
  type MealPlanEntry,
  type MealSlot,
} from "@keepitbalance/shared/meal-planning";
import { useCurrentUser } from "@/modules/auth";
import { DocumentTitle } from "@/shared/components/DocumentTitle";
import { Button } from "@/shared/components/ui/button";
import { formatCalendarDate } from "@/shared/lib/format";
import { GroceryDrawer } from "../../shared/components/GroceryDrawer.tsx";
import { ConfirmRemoval } from "../../shared/components/ConfirmRemoval.tsx";
import { useMealPlan, useRecipes, useMealPlanPreferences } from "../../shared/planning-queries.ts";
import { useMealMutation, useSaveMealPlanPreferences } from "../../shared/use-planning-mutations.ts";
import { groceryError } from "../../shared/use-grocery-mutations.ts";
import { planningPeriod } from "./planning-week.ts";
import { PlanningDateRange } from "./components/PlanningDateRange.tsx";
import { MealForm } from "./components/MealForm.tsx";
import { MealCalendar } from "./components/MealCalendar.tsx";
import { GenerationPreview } from "./components/GenerationPreview.tsx";

type Editor = { date: string; slot: MealSlot; meal?: MealPlanEntry };
export function MealPlanPage() {
  const user = useCurrentUser();
  const [params, setParams] = useSearchParams();
  const today = usePlanningToday(user.timezone ?? "UTC");
  const savedDates = useMealPlanPreferences();
  const saveDates = useSaveMealPlanPreferences();
  const period = planningPeriod(params, user.timezone ?? "UTC", savedDates);
  const { weekStart: week, startDate, endDate } = resolvePlanningPeriod(period);
  const rangeLength =
    (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000 + 1;
  const days = Array.from({ length: rangeLength }, (_, index) => shiftDay(startDate, index));
  const rangeParams: Record<string, string> =
    "weekStart" in period ? { week } : { start: startDate, end: endDate };
  const requestedDay = params.get("day");
  const selectedDay = requestedDay && days.includes(requestedDay) ? requestedDay : null;
  const recipes = useRecipes();
  const meals = useMealPlan(period);
  const mutation = useMealMutation();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [removing, setRemoving] = useState<MealPlanEntry | null>(null);
  const [preview, setPreview] = useState(false);
  function adjacentPeriod(direction: number) {
    return planningPeriodSchema.safeParse(
      "weekStart" in period
        ? { weekStart: shiftDay(week, direction * 7) }
        : {
            startDate: shiftDay(startDate, direction * rangeLength),
            endDate: shiftDay(endDate, direction * rangeLength),
          },
    );
  }
  function showAdjacent(direction: number) {
    const next = adjacentPeriod(direction);
    if (!next.success) return;
    setParams(
      "weekStart" in next.data
        ? { week: next.data.weekStart }
        : { start: next.data.startDate, end: next.data.endDate },
      { preventScrollReset: true },
    );
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
            aria-label={"weekStart" in period ? "Previous week" : "Previous date range"}
            disabled={!adjacentPeriod(-1).success}
            onClick={() => showAdjacent(-1)}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <span className="text-sm font-medium">
            {formatCalendarDate(startDate)} – {formatCalendarDate(endDate)}
          </span>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={"weekStart" in period ? "Next week" : "Next date range"}
            disabled={!adjacentPeriod(1).success}
            onClick={() => showAdjacent(1)}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setParams({ week: mondayOf(today) }, { preventScrollReset: true })}
          >
            This week
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setParams({ week: mondayOf(today), day: today }, { preventScrollReset: true })}
          >
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
      <PlanningDateRange
        key={`${startDate}-${endDate}`}
        startDate={startDate}
        endDate={endDate}
        onApply={async (range) => {
          await saveDates.mutateAsync(range);
          setParams({ start: range.startDate, end: range.endDate }, { preventScrollReset: true });
        }}
      />
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
        rangeLabel={"weekStart" in period ? "Week" : "All days"}
        onSelectDay={(date) =>
          setParams(date ? { ...rangeParams, day: date } : rangeParams, {
            replace: true,
            preventScrollReset: true,
          })
        }
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
        description="Review shopping needs for the selected dates before changing your list."
        onClose={() => setPreview(false)}
      >
        {preview && <GenerationPreview period={period} onClose={() => setPreview(false)} />}
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
