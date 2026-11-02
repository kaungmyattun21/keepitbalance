import { Apple, Moon, Sun, Sunrise } from "lucide-react";
import { Tabs } from "radix-ui";
import type { MealPlanEntry, MealSlot } from "@keepitbalance/shared/meal-planning";
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
  onSelectDay,
  ...actions
}: MealSlotActions & {
  days: string[];
  meals: MealPlanEntry[];
  today: string;
  selectedDay: string;
  onSelectDay: (date: string) => void;
}) {
  const daily = meals.filter((meal) => meal.date === selectedDay);
  const planned = daily.reduce((total, meal) => total + meal.servings * meal.recipe.caloriesPerServing, 0);
  const eaten = daily
    .filter((meal) => meal.eaten)
    .reduce((total, meal) => total + meal.servings * meal.recipe.caloriesPerServing, 0);
  return (
    <Tabs.Root value={selectedDay} onValueChange={onSelectDay} className="min-w-0 space-y-5">
      <Tabs.List
        aria-label="Choose a meal planning day"
        className="grid grid-cols-7 gap-1 rounded-2xl border border-border/60 bg-card p-1.5 sm:gap-2 sm:p-2"
      >
        {days.map((date) => (
          <Tabs.Trigger
            key={date}
            value={date}
            aria-label={formatCalendarDate(date)}
            className="flex min-h-17 min-w-0 flex-col items-center justify-center gap-2 rounded-xl text-xs text-muted-foreground outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-brand-subtle data-[state=active]:text-brand sm:min-h-19"
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
                  <div
                    key={slot}
                    className="flex min-w-0 flex-col rounded-2xl border border-border/60 bg-card p-4 sm:p-5"
                  >
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
