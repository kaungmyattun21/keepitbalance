import { Apple, CalendarDays, Moon, Plus, Sun, Sunrise } from "lucide-react";
import { Tabs } from "radix-ui";
import type { MealPlanEntry, MealSlot } from "@keepitbalance/shared/meal-planning";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { formatCalendarDate } from "@/shared/lib/format";
import { MealSlotCard, type MealSlotActions } from "./MealSlotCard.tsx";

const slots = [
  { slot: "breakfast", label: "Breakfast", icon: Sunrise },
  { slot: "lunch", label: "Lunch", icon: Sun },
  { slot: "dinner", label: "Dinner", icon: Moon },
  { slot: "snack", label: "Snack", icon: Apple },
] satisfies { slot: MealSlot; label: string; icon: typeof Sun }[];

export function MealCalendar({
  days,
  meals,
  today,
  selectedDay,
  rangeLabel = "Week",
  onSelectDay,
  ...actions
}: MealSlotActions & {
  days: string[];
  meals: MealPlanEntry[];
  today: string;
  selectedDay: string | null;
  rangeLabel?: string;
  onSelectDay: (date: string | null) => void;
}) {
  const daily = meals.filter((meal) => meal.date === selectedDay);
  const planned = daily.reduce((total, meal) => total + meal.servings * meal.recipe.caloriesPerServing, 0);
  const eaten = daily
    .filter((meal) => meal.eaten)
    .reduce((total, meal) => total + meal.servings * meal.recipe.caloriesPerServing, 0);
  return (
    <Tabs.Root
      value={selectedDay ?? "week"}
      onValueChange={(value) => onSelectDay(value === "week" ? null : value)}
      className="min-w-0 space-y-5"
    >
      <Tabs.List
        aria-label="Choose a meal planning day"
        className={cn(
          "gap-1 rounded-2xl bg-card p-1.5 sm:gap-2 sm:p-2",
          days.length === 7 ? "grid grid-cols-8" : "flex overflow-x-auto",
        )}
      >
        <Tabs.Trigger
          value="week"
          className={cn(
            "flex min-h-17 min-w-0 flex-col items-center justify-center gap-2 rounded-xl text-xs text-muted-foreground outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-brand-subtle data-[state=active]:text-brand sm:min-h-19",
            days.length !== 7 && "min-w-16 flex-1 shrink-0",
          )}
        >
          <CalendarDays className="size-4" aria-hidden />
          <span>{rangeLabel}</span>
        </Tabs.Trigger>
        {days.map((date) => (
          <Tabs.Trigger
            key={date}
            value={date}
            aria-label={formatCalendarDate(date)}
            className={cn(
              "flex min-h-17 min-w-0 flex-col items-center justify-center gap-2 rounded-xl text-xs text-muted-foreground outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-brand-subtle data-[state=active]:text-brand sm:min-h-19",
              days.length !== 7 && "min-w-12 flex-1 shrink-0",
            )}
          >
            <span>
              {new Intl.DateTimeFormat(undefined, { weekday: "short", timeZone: "UTC" }).format(
                new Date(`${date}T00:00:00Z`),
              )}
            </span>
            <time
              dateTime={date}
              aria-current={date === today ? "date" : undefined}
              className="relative text-base font-medium tabular-nums"
            >
              {Number(date.slice(8))}
              {date === today && (
                <span className="absolute -bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-brand" />
              )}
            </time>
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <Tabs.Content
        value="week"
        className="space-y-4 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {selectedDay === null && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <h3 className="text-sm font-medium">
                {rangeLabel === "Week" ? "Your week at a glance" : "Your plan at a glance"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {meals.length} {meals.length === 1 ? "meal" : "meals"} planned ·{" "}
                {meals.filter((meal) => meal.eaten).length} eaten
              </p>
            </div>
            {days.map((date) => {
              const entries = meals.filter((meal) => meal.date === date);
              const dayName = new Intl.DateTimeFormat(undefined, { weekday: "long", timeZone: "UTC" }).format(
                new Date(`${date}T00:00:00Z`),
              );
              return (
                <section
                  key={date}
                  aria-label={`Meals for ${date}`}
                  className="rounded-2xl bg-card p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <time
                        dateTime={date}
                        aria-current={date === today ? "date" : undefined}
                        className={
                          date === today
                            ? "grid size-10 shrink-0 place-items-center rounded-xl bg-brand-subtle text-sm font-semibold text-brand"
                            : "grid size-10 shrink-0 place-items-center rounded-xl bg-muted/40 text-sm font-semibold"
                        }
                      >
                        {Number(date.slice(8))}
                      </time>
                      <div>
                        <h4 className="text-sm font-medium">
                          {dayName}
                          {date === today && <span className="ml-2 text-xs text-brand">Today</span>}
                        </h4>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {entries.length
                            ? `${entries.length} ${entries.length === 1 ? "meal" : "meals"} planned`
                            : "No meals planned"}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!actions.canAdd || actions.busy}
                      aria-label={`Plan meal for ${date}`}
                      onClick={() => actions.onAdd(date, "dinner")}
                    >
                      <Plus className="size-3.5" aria-hidden />
                      Plan meal
                    </Button>
                  </div>
                  {entries.length > 0 && (
                    <div className="mt-4 grid gap-3 @2xl/planner:grid-cols-2 @5xl/planner:grid-cols-4">
                      {slots
                        .filter(({ slot }) => entries.some((meal) => meal.slot === slot))
                        .map(({ slot, label, icon: Icon }) => (
                          <div key={slot} className="min-w-0 rounded-xl bg-background/65 p-2">
                            <p className="mb-1 flex items-center gap-2 px-2 pt-1 text-xs font-medium text-muted-foreground">
                              <Icon className="size-3.5" aria-hidden />
                              {label}
                            </p>
                            <MealSlotCard
                              date={date}
                              slot={slot}
                              meals={entries.filter((meal) => meal.slot === slot)}
                              {...actions}
                            />
                          </div>
                        ))}
                    </div>
                  )}
                </section>
              );
            })}
          </>
        )}
      </Tabs.Content>
      {days.map((date) => (
        <Tabs.Content
          key={date}
          value={date}
          className="space-y-4 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {date === selectedDay && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <h3 className="text-sm font-medium">{formatCalendarDate(date)}</h3>
                {daily.length > 0 && (
                  <p
                    aria-label={`${planned} kcal planned · ${eaten} eaten`}
                    className="text-xs text-muted-foreground"
                  >
                    {planned} kcal planned
                  </p>
                )}
              </div>
              <div className="grid gap-4 @2xl/planner:grid-cols-2">
                {slots.map(({ slot, label, icon: Icon }) => (
                  <div key={slot} className="flex min-w-0 flex-col rounded-2xl bg-card p-4 sm:p-5">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                      <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden />
                      {label}
                    </div>
                    <MealSlotCard
                      date={date}
                      slot={slot}
                      meals={daily.filter((meal) => meal.slot === slot)}
                      {...actions}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
