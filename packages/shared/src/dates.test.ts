import { describe, expect, it } from "vitest";
import { currentMonthIn, shiftMonth, todayIn } from "./dates.ts";

describe("todayIn / currentMonthIn", () => {
  // 2026-10-31 18:00 UTC: still Oct 31 in London, already Nov 1 in Yangon.
  const now = new Date("2026-10-31T18:00:00Z");

  it("uses the user's timezone, not UTC", () => {
    expect(todayIn("Europe/London", now)).toBe("2026-10-31");
    expect(todayIn("Asia/Yangon", now)).toBe("2026-11-01");
  });

  it("derives the month the same way", () => {
    expect(currentMonthIn("Europe/London", now)).toBe("2026-10");
    expect(currentMonthIn("Asia/Yangon", now)).toBe("2026-11");
  });
});

describe("shiftMonth", () => {
  it("moves across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-09", 0)).toBe("2026-09");
  });
});
