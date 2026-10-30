import { useState } from "react";
import { Link, useLocation } from "react-router";
import type { Bill } from "@keepitbalance/shared/finance";
import { todayIn } from "@keepitbalance/shared/dates";
import { CalendarClock, Plus } from "lucide-react";
import { useCurrentUser } from "@/modules/auth";
import { DocumentTitle } from "@/shared/components/DocumentTitle";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { useCategoryGroups } from "../../shared/hooks/use-category-groups.ts";
import { useBills } from "./hooks/use-bills.ts";
import { BillForm } from "./components/BillForm.tsx";
import { BillList } from "./components/BillList.tsx";
import { PayBillDialog } from "./components/PayBillDialog.tsx";
import { DeleteBillDialog } from "./components/DeleteBillDialog.tsx";

export function BillsPage() {
  const bills = useBills();
  const groups = useCategoryGroups();
  const user = useCurrentUser();
  const today = todayIn(user.timezone ?? "UTC");
  const location = useLocation();
  const [editor, setEditor] = useState<Bill | "new" | null>(null);
  const [paying, setPaying] = useState<Bill | null>(null);
  const [deleting, setDeleting] = useState<Bill | null>(null);
  const closeEditor = () => setEditor(null);

  return (
    <Sheet open={editor !== null} onOpenChange={(open) => !open && closeEditor()}>
      <div className="flex w-full flex-col gap-6">
        <DocumentTitle title="Bills" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold tracking-tight">Recurring bills</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Track what's due and record payments when you make them.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              className="text-sm underline underline-offset-4"
              to="/finance/categories"
              state={{ returnTo: location.pathname + location.search }}
            >
              Manage categories
            </Link>
            <SheetTrigger asChild>
              <Button onClick={() => setEditor("new")}>
                <Plus aria-hidden />
                Add bill
              </Button>
            </SheetTrigger>
          </div>
        </div>
        {bills.length === 0 && (
          <section
            aria-label="No bills yet"
            className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card/50 px-6 py-14 text-center"
          >
            <CalendarClock className="size-8 text-brand" aria-hidden />
            <h3 className="text-lg font-semibold">No bills yet</h3>
            <p className="text-sm text-muted-foreground">
              Add your rent, utilities or subscriptions to see upcoming payments here.
            </p>
          </section>
        )}
        <BillList
          title="Overdue"
          overdue
          bills={bills.filter((bill) => bill.nextDueDate < today)}
          onEdit={setEditor}
          onPay={setPaying}
          onDelete={setDeleting}
        />
        <BillList
          title="Due today"
          bills={bills.filter((bill) => bill.nextDueDate === today)}
          onEdit={setEditor}
          onPay={setPaying}
          onDelete={setDeleting}
        />
        <BillList
          title="Upcoming"
          bills={bills.filter((bill) => bill.nextDueDate > today)}
          onEdit={setEditor}
          onPay={setPaying}
          onDelete={setDeleting}
        />
      </div>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{editor === "new" ? "Add bill" : "Edit bill"}</SheetTitle>
          <SheetDescription>
            Set an expected amount, expense category and repeat schedule. Payments are recorded only when you
            mark a bill paid.
          </SheetDescription>
        </SheetHeader>
        {editor !== null && (
          <BillForm
            key={editor === "new" ? "new" : editor.id}
            bill={editor === "new" ? undefined : editor}
            groups={groups}
            today={today}
            onSaved={closeEditor}
            onCancel={closeEditor}
          />
        )}
      </SheetContent>
      <PayBillDialog bill={paying} today={today} onClose={() => setPaying(null)} />
      <DeleteBillDialog bill={deleting} onClose={() => setDeleting(null)} />
    </Sheet>
  );
}
