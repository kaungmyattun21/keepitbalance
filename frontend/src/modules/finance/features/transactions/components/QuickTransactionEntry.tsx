import { lazy, Suspense, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/shared/components/ui/sheet";

const QuickTransactionForm = lazy(() => import("./QuickTransactionForm.tsx"));

export function QuickTransactionEntry() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="flex flex-col items-center gap-0.5">
        <SheetTrigger asChild>
          <Button size="icon" className="size-12 rounded-2xl" aria-label="Log transaction">
            <Plus className="size-6" aria-hidden />
          </Button>
        </SheetTrigger>
        <span className="text-[0.6875rem] font-medium text-brand" aria-hidden>
          Log
        </span>
      </div>
      <SheetContent className="sm:max-w-md">
        <SheetHeader className="p-5 pr-18 sm:pr-14">
          <SheetTitle>Log transaction</SheetTitle>
          <SheetDescription>A quick entry, right where you are.</SheetDescription>
        </SheetHeader>
        {open && (
          <Suspense
            fallback={
              <p role="status" className="p-6 text-sm text-muted-foreground">
                Loading transaction form…
              </p>
            }
          >
            <QuickTransactionForm onSaved={() => setOpen(false)} />
          </Suspense>
        )}
      </SheetContent>
    </Sheet>
  );
}
