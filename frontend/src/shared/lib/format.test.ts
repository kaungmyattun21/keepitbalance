import { describe, expect, it } from "vitest";
import { formatCalendarDate, formatDateTime, formatMoney, formatMonth } from "./format.ts";

describe("formatMoney", () => {
  it("formats a decimal string with 2 decimals and grouping", () => {
    expect(formatMoney("3000.00", { locale: "en-US" })).toBe("3,000.00");
    expect(formatMoney("5", { locale: "en-US" })).toBe("5.00");
  });

  it("adds a currency when given", () => {
    expect(formatMoney("1234.5", { currency: "USD", locale: "en-US" })).toBe("$1,234.50");
  });

  it("keeps digits a float would lose", () => {
    // As a JS number this is 9007199254740992 (precision lost); as a string it stays exact.
    expect(formatMoney("9007199254740993.10", { locale: "en-US" })).toBe("9,007,199,254,740,993.10");
  });
});

describe("formatCalendarDate", () => {
  it("never shifts the day, whatever the timezone", () => {
    // new Date("2026-09-27") is midnight UTC, which is Sep 26 in New York; we must still show Sep 27.
    expect(formatCalendarDate("2026-09-27", { locale: "en-US" })).toBe("Sep 27, 2026");
  });

  it("rejects values that aren't YYYY-MM-DD", () => {
    expect(() => formatCalendarDate("2026-09-27T10:00:00Z")).toThrow(RangeError);
  });
});

describe("formatMonth", () => {
  it("formats YYYY-MM as month and year", () => {
    expect(formatMonth("2026-09", { locale: "en-US" })).toBe("September 2026");
  });
});

describe("formatDateTime", () => {
  it("shows an instant in the given timezone", () => {
    const instant = "2026-10-22T20:30:00Z";
    expect(formatDateTime(instant, "UTC", { locale: "en-US" })).toBe("Oct 22, 2026, 8:30 PM");
    expect(formatDateTime(instant, "Asia/Yangon", { locale: "en-US" })).toBe("Oct 23, 2026, 3:00 AM"); // UTC+6:30
  });
});
