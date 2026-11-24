import { describe, expect, it } from "vitest";
import { parseQuickEntry } from "./quick-entry.ts";

// 2026-11-24 is a Tuesday.
const today = "2026-11-24";
const parse = (text: string) => parseQuickEntry(text, today);

describe("parseQuickEntry", () => {
  it("reads a short spoken expense", () => {
    expect(parse("coffee 85 yesterday")).toEqual({ amount: "85", date: "2026-11-23", note: "Coffee" });
  });

  it("reads decimals, thousands separators and currency words", () => {
    expect(parse("lunch 120.5 baht")).toMatchObject({ amount: "120.50", note: "Lunch" });
    expect(parse("Paid 1,200 for electricity last Friday")).toEqual({
      type: "expense",
      amount: "1200",
      date: "2026-11-20",
      note: "Electricity",
    });
    expect(parse("taxi $15")).toMatchObject({ amount: "15", note: "Taxi" });
  });

  it("reads thousands written with a space, as speech recognition often does", () => {
    expect(parse("a laptop 23 000")).toEqual({ amount: "23000", note: "Laptop" });
    expect(parse("rent 12 500 baht")).toMatchObject({ amount: "12500", note: "Rent" });
    expect(parse("car 1 250 000")).toMatchObject({ amount: "1250000", note: "Car" });
    expect(parse("the 2 tickets 900")).toMatchObject({ amount: "900", note: "2 tickets" });
  });

  it("prefers a labelled amount, otherwise the largest number", () => {
    expect(parse("2 coffees 170")).toMatchObject({ amount: "170", note: "2 coffees" });
    expect(parse("3 shirts 600 baht at the mall 2")).toMatchObject({ amount: "600" });
  });

  it("reads relative dates", () => {
    expect(parse("snacks 40 today").date).toBe(today);
    expect(parse("snacks 40 the day before yesterday").date).toBe("2026-11-22");
    expect(parse("snacks 40 3 days ago")).toMatchObject({ date: "2026-11-21", amount: "40" });
    expect(parse("dinner 300 on sunday").date).toBe("2026-11-22");
    expect(parse("dinner 300 tuesday").date).toBe(today);
    expect(parse("dinner 300 last tuesday").date).toBe("2026-11-17");
  });

  it("recognises income", () => {
    expect(parse("got paid 30,000 salary")).toEqual({ type: "income", amount: "30000", note: "Salary" });
    expect(parse("refund 250 from shopee").type).toBe("income");
  });

  it("leaves out what it cannot find", () => {
    expect(parse("groceries")).toEqual({ note: "Groceries" });
    expect(parse("   ")).toEqual({});
    expect(parse("coffee 0")).toEqual({ note: "Coffee 0" });
  });
});
