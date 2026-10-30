import type { Bill, CategoryGroup } from "@keepitbalance/shared/finance";

export type BillFormOptions = { bill?: Bill; groups: CategoryGroup[]; today: string; onSaved: () => void };
export type PayBillFormOptions = { bill: Bill; today: string; onSaved: () => void };
