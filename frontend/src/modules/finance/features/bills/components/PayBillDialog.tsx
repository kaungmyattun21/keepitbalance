import type { Bill } from "@keepitbalance/shared/finance";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { FieldIdScope } from "@/shared/components/form/FieldIdScope";
import { FormAlert } from "@/shared/components/form/FormAlert";
import { TextField } from "@/shared/components/form/TextField";
import { Button } from "@/shared/components/ui/button";
import { formatCalendarDate } from "@/shared/lib/format";
import { usePayBillForm } from "../hooks/use-pay-bill-form.ts";
import type { PayBillFormOptions } from "../types.ts";

function PaymentForm({ onCancel, ...options }: PayBillFormOptions & { onCancel: () => void }) {
  const { form, formError, handleSubmit } = usePayBillForm(options);
  return (
    <FieldIdScope>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
        <FormAlert message={formError} />
        <TextField control={form.control} name="amount" label="Amount paid" inputMode="decimal" />
        <TextField control={form.control} name="date" label="Payment date" type="date" />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Recording…" : "Record payment"}
          </Button>
        </div>
      </form>
    </FieldIdScope>
  );
}

export function PayBillDialog({
  bill,
  today,
  onClose,
}: {
  bill: Bill | null;
  today: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={bill !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mark bill paid</DialogTitle>
          <DialogDescription>
            {bill && `${bill.name}, due ${formatCalendarDate(bill.nextDueDate)}. `}Records an expense in the
            selected category and advances the schedule by one occurrence.
          </DialogDescription>
        </DialogHeader>
        {bill && <PaymentForm key={bill.id} bill={bill} today={today} onSaved={onClose} onCancel={onClose} />}
      </DialogContent>
    </Dialog>
  );
}
