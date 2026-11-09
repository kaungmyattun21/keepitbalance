import { lazy, Suspense, useState } from "react";
import { format } from "date-fns/format";
import { parseISO } from "date-fns/parseISO";
import { differenceInCalendarDays } from "date-fns/differenceInCalendarDays";
import type { DateRange } from "react-day-picker";
import { CalendarDays, ChevronDown } from "lucide-react";
import {
  planningDateRangeSchema,
  type PlanningDateRange as PlanningRange,
} from "@keepitbalance/shared/meal-planning";
import { Button } from "@/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { groceryError } from "../../../shared/use-grocery-mutations.ts";
import { formatCalendarDate } from "@/shared/lib/format";

const Calendar = lazy(() =>
  import("@/shared/components/ui/calendar").then(({ Calendar }) => ({ default: Calendar })),
);

export function PlanningDateRange({
  startDate,
  endDate,
  onApply,
}: PlanningRange & { onApply: (range: PlanningRange) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>({
    from: parseISO(startDate),
    to: parseISO(endDate),
  });
  const [choosingEnd, setChoosingEnd] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  function select(day: Date) {
    setError(null);
    if (!choosingEnd || !range?.from) {
      setRange({ from: day });
      setChoosingEnd(true);
      return;
    }
    setRange(day < range.from ? { from: day, to: range.from } : { from: range.from, to: day });
    setChoosingEnd(false);
  }
  async function apply() {
    if (!range?.from || !range.to || choosingEnd || pending) return;
    const result = planningDateRangeSchema.safeParse({
      startDate: format(range.from, "yyyy-MM-dd"),
      endDate: format(range.to, "yyyy-MM-dd"),
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Choose valid dates.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      await onApply(result.data);
      setOpen(false);
    } catch (error) {
      setError(groceryError(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-4">
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          if (pending) return;
          if (nextOpen) {
            setRange({ from: parseISO(startDate), to: parseISO(endDate) });
            setChoosingEnd(false);
            setError(null);
          }
          setOpen(nextOpen);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            aria-label="Choose planning dates"
            disabled={pending}
            className="h-auto min-h-11 w-full justify-start gap-3 px-2 py-2 text-left sm:w-auto"
          >
            <CalendarDays className="size-4 shrink-0 text-brand" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-normal text-muted-foreground">Planning dates</span>
              <span className="mt-1 block text-sm font-medium wrap-anywhere">
                {formatCalendarDate(startDate)} – {formatCalendarDate(endDate)}
              </span>
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="start"
          avoidCollisions={false}
          collisionPadding={12}
          aria-label="Choose planning date range"
          className="max-h-(--radix-popover-content-available-height) w-80 max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain p-0"
        >
          <div className="px-4 pt-4">
            <p className="text-sm font-medium">Choose your dates</p>
            <p className="mt-1 text-xs text-muted-foreground">Select a start date, then an end date.</p>
          </div>
          <Suspense
            fallback={
              <p
                role="status"
                className="flex min-h-80 items-center justify-center text-sm text-muted-foreground"
              >
                Loading calendar…
              </p>
            }
          >
            <Calendar
              mode="range"
              numberOfMonths={1}
              fixedWeeks
              required
              autoFocus
              selected={range}
              defaultMonth={parseISO(startDate)}
              startMonth={parseISO("0001-01-01")}
              endMonth={parseISO("9999-12-01")}
              onSelect={(_next, day) => select(day)}
              disabled={(day) => {
                const date = format(day, "yyyy-MM-dd");
                return (
                  pending ||
                  date < "0001-01-01" ||
                  date > "9999-12-30" ||
                  Boolean(
                    choosingEnd && range?.from && Math.abs(differenceInCalendarDays(day, range.from)) > 30,
                  )
                );
              }}
              className="w-full p-3 [--cell-size:--spacing(9)]"
            />
          </Suspense>
          <div className="space-y-3 px-4 pb-4">
            <p aria-live="polite" className="min-h-8 text-xs leading-relaxed text-muted-foreground">
              {range?.from
                ? `${format(range.from, "MMM d, yyyy")} – ${range.to ? format(range.to, "MMM d, yyyy") : "Choose end date"}`
                : "Choose a start date"}
            </p>
            {error && (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={pending || !range?.from || !range.to || choosingEnd}
                onClick={() => void apply()}
              >
                {pending ? "Saving dates…" : "Apply dates"}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-muted-foreground">Up to 31 days, including both dates.</p>
    </div>
  );
}
