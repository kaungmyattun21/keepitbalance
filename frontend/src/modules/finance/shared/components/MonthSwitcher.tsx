import { shiftMonth } from "@keepitbalance/shared/dates";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { formatMonth } from "@/shared/lib/format";

type MonthSwitcherProps = {
  month: string;
  onMonthChange: (month: string) => void;
};

export function MonthSwitcher({ month, onMonthChange }: MonthSwitcherProps) {
  return (
    <div className="flex w-full max-w-full min-w-0 items-center justify-between gap-1 sm:w-auto sm:justify-start">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Previous month"
        onClick={() => onMonthChange(shiftMonth(month, -1))}
      >
        <ChevronLeft />
      </Button>
      <p
        aria-live="polite"
        className="min-w-0 flex-1 text-center text-sm font-medium tabular-nums sm:min-w-28 sm:flex-none"
      >
        {formatMonth(month)}
      </p>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Next month"
        onClick={() => onMonthChange(shiftMonth(month, 1))}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
