import { CategoryIcon } from "../../../shared/components/CategoryIcon";
import { Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { Bill } from "@keepitbalance/shared/finance";
import { SectionCard } from "@/shared/components/SectionCard";
import { Button } from "@/shared/components/ui/button";
import { SheetTrigger } from "@/shared/components/ui/sheet";
import { formatMoney, formatCalendarDate } from "@/shared/lib/format";
import { sumMoney } from "@/shared/lib/money";

type BillListProps = {
  title: string;
  overdue?: boolean;
  paid?: boolean;
  bills: Bill[];
  onEdit: (bill: Bill) => void;
  onPay: (bill: Bill) => void;
  onDelete: (bill: Bill) => void;
};
export function BillList({
  title,
  bills,
  overdue = false,
  paid = false,
  onEdit,
  onPay,
  onDelete,
}: BillListProps) {
  if (!bills.length) return null;
  return (
    <SectionCard
      title={title}
      className={overdue ? "[&_[data-slot=card-title]]:text-destructive" : undefined}
      description={
        paid
          ? `${bills.length} ${bills.length === 1 ? "bill" : "bills"} paid · next payments scheduled`
          : `${bills.length} ${bills.length === 1 ? "bill" : "bills"} · ${formatMoney(sumMoney(bills.map((bill) => bill.amount)))} due`
      }
    >
      <ul className="space-y-1">
        {bills.map((bill) => (
          <li key={bill.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <h3 className={cn("min-w-0 font-medium break-words", overdue && "text-destructive")}>
                {bill.name}
              </h3>
              {paid && bill.lastPaidDate && (
                <span
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand/15 bg-brand-subtle/50 px-2.5 py-1 text-xs font-medium text-brand"
                  aria-label={`Last payment paid on ${formatCalendarDate(bill.lastPaidDate)}`}
                >
                  <Check className="size-3.5" aria-hidden />
                  Paid
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-3 @2xl/section:flex-row @2xl/section:items-center @2xl/section:justify-between">
              <div className="min-w-0 flex-1 wrap-anywhere">
                <p className="mt-1 text-sm text-muted-foreground">
                  <CategoryIcon
                    icon={bill.category.icon}
                    variant="plain"
                    className="mr-1 inline-block size-3.5 align-text-bottom"
                  />
                  {bill.category.name} · {bill.frequency} ·{" "}
                  <span className={cn(overdue && "font-medium text-destructive")}>
                    {paid ? "Next due" : "Due"} {formatCalendarDate(bill.nextDueDate)}
                  </span>
                </p>
                {bill.lastPaidDate && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Last paid {formatCalendarDate(bill.lastPaidDate)}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "w-full min-w-0 font-medium wrap-anywhere tabular-nums @2xl/section:mr-2 @2xl/section:w-auto",
                    overdue && "text-destructive",
                  )}
                >
                  {paid && (
                    <span className="mr-2 text-xs font-normal text-muted-foreground">Next payment</span>
                  )}
                  {formatMoney(bill.amount)}
                </span>
                {!paid && (
                  <Button size="sm" aria-label={`Mark ${bill.name} paid`} onClick={() => onPay(bill)}>
                    Mark paid
                  </Button>
                )}
                <SheetTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={`Edit ${bill.name}`}
                    onClick={() => onEdit(bill)}
                  >
                    Edit
                  </Button>
                </SheetTrigger>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Delete ${bill.name}`}
                  onClick={() => onDelete(bill)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
