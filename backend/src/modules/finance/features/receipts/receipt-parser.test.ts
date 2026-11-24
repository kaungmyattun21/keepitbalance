import { describe, expect, it } from "vitest";
import { parseReceipt } from "./receipt-parser.ts";

describe("receipt parser", () => {
  it("distinguishes a total from subtotal, cash, and change", () => {
    expect(
      parseReceipt("FRESH MARKET\n2026-11-09\nSUBTOTAL 10.00\nTOTAL $12.50\nCASH 20.00\nCHANGE 7.50"),
    ).toMatchObject({ merchant: "FRESH MARKET", date: "2026-11-09", total: "12.50" });
  });
  it("leaves ambiguous dates and conflicting totals for review", () => {
    expect(parseReceipt("Shop\n09/11/2026\nTOTAL 10.00\nTOTAL 12.00")).toMatchObject({
      date: null,
      total: null,
    });
  });
  it("does not guess a total from an unrelated amount or invalid date", () => {
    expect(parseReceipt("Shop\n2026-02-30\nCASH 99.00")).toMatchObject({ date: null, total: null });
  });
  it("keeps money exact and supports grouped thousands", () => {
    expect(parseReceipt("Shop\nGRAND TOTAL 1,234.56").total).toBe("1234.56");
    expect(parseReceipt("Shop\nTOTAL 0.00").total).toBeNull();
  });

  it("recognizes Costco branding after generic headings without calling Wholesale a merchant", () => {
    expect(parseReceipt("WHOLESALE\nCOSTCO\nMember 123456\nTOTAL 125.50").merchant).toBe("Costco");
    expect(parseReceipt("WHOLESALE\nTAX INVOICE\nTOTAL 125.50").merchant).toBeNull();
    expect(parseReceipt("C0STC0\nWHOLESALE\nTOTAL 125.50").merchant).toBe("Costco");
  });

  it("does not find a merchant brand in a purchased product line", () => {
    expect(parseReceipt("Corner Shop\nCOSTCO muffins 12.50\nTOTAL 12.50").merchant).toBe("Corner Shop");
  });

  it("recognizes Makro and Thai totals, Thai digits and Buddhist calendar dates", () => {
    expect(
      parseReceipt(
        "แม็คโคร\nใบเสร็จรับเงิน\nวันที่ ๐๙/๑๑/๒๕๖๙\nยอดก่อนภาษี 100.00\nภาษี 7.00\nรวมทั้งสิ้น ๑๐๗.๐๐ บาท\nเงินทอน 93.00",
      ),
    ).toMatchObject({ merchant: "Makro", date: "2026-11-09", total: "107.00" });
  });

  it.each([
    ["2026/11/09", "2026-11-09"],
    ["19/11/2026", "2026-11-19"],
    ["11/19/2026", "2026-11-19"],
    ["11/19/26", "2026-11-19"],
    ["9 Nov 2026", "2026-11-09"],
    ["November 9, 2026", "2026-11-09"],
    ["วันที่ 9 พ.ย. 2569", "2026-11-09"],
    ["วันที่ 9 พฤศจิกายน 2569", "2026-11-09"],
    ["วันที่ 09/11/2026", "2026-11-09"],
  ])("reads the supported date %s", (value, expected) => {
    expect(parseReceipt(`Shop\n${value}\nTOTAL 10.00`).date).toBe(expected);
  });

  it("rejects impossible or conflicting dates instead of normalizing them", () => {
    for (const value of ["31/02/2026", "2026-13-01", "2026-11-09\n2026-11-10", "02/03/2026"]) {
      expect(parseReceipt(`Shop\n${value}`).date).toBeNull();
    }
  });

  it("does not interpret a shortened Buddhist year as a future Gregorian year", () => {
    expect(parseReceipt("กรุงไทย\nโอนเงินสำเร็จ\n09/11/69").date).toBeNull();
    expect(parseReceipt("วันที่ 9 พ.ย. 69").date).toBeNull();
  });

  it.each([
    ["TOTAL\n฿ 1,234.56", "1234.56"],
    ["รวมสุทธิ\n1,234.56 บาท", "1234.56"],
    ["ยอดรวมสุทธิ 1,234.56 บาท", "1234.56"],
    ["รวมเป็นเงิน 1,234.56 บาท", "1234.56"],
    ["TOTAL EUR 1.234,56", "1234.56"],
    ["TOTAL 12,50 EUR", "12.50"],
    ["TOTAL THB 500", "500.00"],
    ["*** TOTAL : 125.50", "125.50"],
  ])("reads a supported labeled amount %s", (value, expected) => {
    expect(parseReceipt(`Shop\n${value}`).total).toBe(expected);
  });

  it("does not substitute savings, item counts, refunds or cash for the total", () => {
    for (const value of [
      "TOTAL SAVINGS 10.00",
      "TOTAL ITEMS 2",
      "TOTAL -$10.00",
      "TOTAL (10.00)",
      "TOTAL\nCASH 50.00",
      "SUB TOTAL 10.00\nCASH 20.00\nCHANGE 10.00",
    ]) {
      expect(parseReceipt(`Shop\n${value}`).total).toBeNull();
    }
  });

  it("uses explicit payable totals while leaving equally ranked conflicting totals blank", () => {
    expect(parseReceipt("Shop\nTOTAL 100.00\nTOTAL DUE 107.00").total).toBe("107.00");
    expect(parseReceipt("Shop\nGRAND TOTAL 100.00\nTOTAL DUE 107.00").total).toBeNull();
  });

  it("treats Krungthai as a bank and extracts the transfer recipient and amount", () => {
    const draft = parseReceipt(
      "KRUNGTHAI BANK\nTransfer successful\nSender: Jane\nRecipient: Fresh Market\nAmount\nTHB 1,250.00\nFee 0.00\n2026-11-09",
    );
    expect(draft).toMatchObject({ merchant: "Fresh Market", date: "2026-11-09", total: "1250.00" });
    expect(draft.warnings.join(" ")).toContain("transfers between your own accounts are not expenses");
  });

  it("handles Thai recipient labels and doesn't fall back to bank or sender names", () => {
    expect(
      parseReceipt(
        "กรุงไทย\nโอนเงินสำเร็จ\nผู้โอน: สมชาย\nผู้รับเงิน\nร้านอาหารอร่อย\nจำนวนเงิน 250.00 บาท\nค่าธรรมเนียม 0.00\n9 พ.ย. 2569",
      ),
    ).toMatchObject({ merchant: "ร้านอาหารอร่อย", date: "2026-11-09", total: "250.00" });
    expect(
      parseReceipt("KRUNGTHAI BANK\nTransfer successful\nSender: Jane\nAmount 500.00").merchant,
    ).toBeNull();
    expect(parseReceipt("KRUNGTHAI\nTransfer successful\nTOTAL 500.00").merchant).toBeNull();
  });

  it("warns when recognition confidence is low", () => {
    expect(parseReceipt("Shop\nTOTAL 10.00", 45).warnings.join(" ")).toContain("confidence is low");
  });

  it("reads a clipped TOTAL with tax and cash context, keeping cash and change separate", () => {
    const receipt = parseReceipt(
      'CP Axtra PCL\n22-06-2025\n"OTA 509.00\nVAT 33.30\n{ ASH 1000.00\nCHANGE 491.00',
    );
    expect(receipt).toMatchObject({ date: "2025-06-22", total: "509.00" });
    expect(receipt.warnings.join(" ")).toContain("partially clipped");
    expect(parseReceipt("(9 Ass\nAxtra PCL บางบัวทอง\n22-06-2025\nTOTAL 509.00").merchant).toBe("CP Axtra");
    expect(parseReceipt("Shop\nOTAL 509.00").total).toBeNull();
    expect(parseReceipt("Shop\nOTAL 509.00\nCASH 1000.00").total).toBeNull();
    expect(parseReceipt("Shop\nOTAL 509.00 FAB AR\nASH 1000 . 00\n# VAT INCLUDED #").total).toBe("509.00");
    expect(parseReceipt("Shop\nOTAL 509.00\nOTAL 508.00\nASH 1000.00\nVAT 33.30").total).toBeNull();
  });

  it("uses a plain AMOUNT line only as a fallback total on the same line", () => {
    expect(parseReceipt("Shop\nAMOUNT                                                   325.00").total).toBe(
      "325.00",
    );
    expect(parseReceipt("Shop\nAMOUNT 325.00\nTOTAL 350.00").total).toBe("350.00");
    expect(parseReceipt("Shop\nQTY\nAMOUNT\n12.00").total).toBeNull();
  });
});
