import { describe, expect, it } from "vitest";
import type { BillFrequency } from "@keepitbalance/shared/finance";
import { nextBillDate } from "./recurrence.ts";

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe("bill recurrence", () => {
  it.each<[string, string, BillFrequency, string]>([
    ["2026-01-31", "2026-01-31", "monthly", "2026-02-28"],
    ["2026-02-28", "2026-01-31", "monthly", "2026-03-31"],
    ["2028-01-31", "2028-01-31", "monthly", "2028-02-29"],
    ["2026-12-31", "2026-01-31", "monthly", "2027-01-31"],
    ["2024-02-29", "2024-02-29", "yearly", "2025-02-28"],
    ["2027-02-28", "2024-02-29", "yearly", "2028-02-29"],
    ["2026-12-28", "2026-12-28", "weekly", "2027-01-04"],
    ["2026-03-05", "2026-03-05", "monthly", "2026-04-05"],
  ])("advances %s anchored on %s (%s) to %s", (due, anchor, frequency, expected) => {
    expect(nextBillDate(date(due), date(anchor), frequency).toISOString()).toBe(`${expected}T00:00:00.000Z`);
  });
});
