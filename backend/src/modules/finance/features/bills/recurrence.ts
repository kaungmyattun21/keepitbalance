import type { BillFrequency } from "@keepitbalance/shared/finance";

// Clamp short months against the original anchor, so Jan 31 -> Feb 28 -> Mar 31.
export function nextBillDate(due: Date, anchor: Date, frequency: BillFrequency): Date {
  if (frequency === "weekly") {
    const next = new Date(due);
    next.setUTCDate(next.getUTCDate() + 7);
    return next;
  }
  const year = due.getUTCFullYear() + (frequency === "yearly" ? 1 : 0);
  const month = frequency === "yearly" ? anchor.getUTCMonth() : due.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(anchor.getUTCDate(), lastDay)));
}
