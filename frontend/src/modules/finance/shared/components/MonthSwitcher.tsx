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
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Previous month"
        onClick={() => onMonthChange(shiftMonth(month, -1))}
      >
        <ChevronLeft />
      </Button>
      <p aria-live="polite" className="min-w-28 text-center text-sm font-medium tabular-nums">
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
