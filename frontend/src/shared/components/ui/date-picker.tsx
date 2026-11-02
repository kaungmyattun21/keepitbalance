import { lazy, Suspense, useEffect, useRef, useState, type ComponentProps } from "react";
import { format } from "date-fns/format";
import { isValid } from "date-fns/isValid";
import { parseISO } from "date-fns/parseISO";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";

const Calendar = lazy(() => import("./calendar").then(({ Calendar }) => ({ default: Calendar })));

type DatePickerProps = Omit<ComponentProps<typeof Input>, "type" | "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  label: string;
};

export function DatePicker({ value, onChange, label, disabled, ...props }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [alignOffset, setAlignOffset] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  function alignCalendar() {
    const right = trigger.current?.getBoundingClientRect().right;
    if (right === undefined) return;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const width = Math.min(288, viewportWidth - 16);
    const left = right - width;
    const boundedLeft = Math.max(8, Math.min(left, viewportWidth - width - 8));
    setAlignOffset(left - boundedLeft);
  }
  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", alignCalendar);
    return () => window.removeEventListener("resize", alignCalendar);
  }, [open]);
  const parsed = parseISO(value);
  // Calendar days stay local here: ISO timestamps would shift dates in some timezones.
  const selected = isValid(parsed) && format(parsed, "yyyy-MM-dd") === value ? parsed : undefined;

  return (
    <Popover open={open} onOpenChange={(nextOpen) => {
      if (nextOpen) alignCalendar();
      setOpen(nextOpen);
    }}>
      <div className="relative">
        <Input
          {...props}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          inputMode="numeric"
          autoComplete="off"
          placeholder="YYYY-MM-DD"
          className="pr-11"
        />
        <PopoverTrigger asChild>
          <Button
            ref={trigger}
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
            aria-label={`Open calendar for ${label}`}
          >
            <CalendarIcon aria-hidden />
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent
        side="bottom"
        align="end"
        alignOffset={alignOffset}
        sideOffset={6}
        avoidCollisions={false}
        collisionPadding={8}
        className="z-60 max-h-(--radix-popover-content-available-height) w-72 max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain p-0"
        aria-label={`Choose ${label.toLowerCase()}`}
      >
        <div className="min-h-88 w-full">
          <Suspense
            fallback={
              <div
                role="status"
                className="flex h-88 w-full items-center justify-center text-muted-foreground"
              >
                Loading calendar…
              </div>
            }
          >
            <Calendar
              mode="single"
              fixedWeeks
              required
              selected={selected}
              defaultMonth={selected}
              autoFocus
              className="[--cell-size:--spacing(9)]"
              onSelect={(date) => {
                onChange(format(date, "yyyy-MM-dd"));
                setOpen(false);
              }}
            />
          </Suspense>
        </div>
        <p className="border-t px-4 py-3 text-xs text-muted-foreground">
          You can also type a date as YYYY-MM-DD.
        </p>
      </PopoverContent>
    </Popover>
  );
}
