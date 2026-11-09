import type { ReceiptDraft } from "@keepitbalance/shared/receipts";
import { findMerchant, isBankSlip } from "./receipt-merchant.ts";
import { findReceiptDate } from "./receipt-date.ts";
import { findReceiptTotal } from "./receipt-total.ts";

// Suggestions backed by recognized text, never permission to create a purchase.
export function parseReceipt(text: string, confidence?: number): ReceiptDraft {
  const normalized = text
    .normalize("NFKC")
    .replace(/\u0E4D\u0E32/g, "\u0E33")
    .replace(/[๐-๙]/g, (digit) => String(digit.charCodeAt(0) - "๐".charCodeAt(0)));
  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const bankSlip = isBankSlip(normalized);
  const merchant = findMerchant(lines, bankSlip);
  const { date, warnings: dateWarnings } = findReceiptDate(normalized);
  const total = findReceiptTotal(lines, bankSlip);
  return {
    merchant,
    date,
    total,
    warnings: [
      "Check the suggested details against your receipt before saving.",
      ...(bankSlip
        ? [
            "This appears to be a bank transfer slip. The suggested merchant is the recipient, not the bank. Save it here only if it was an expense; transfers between your own accounts are not expenses.",
          ]
        : []),
      ...(confidence !== undefined && confidence < 70
        ? ["Text recognition confidence is low. Carefully check names, dates and amounts."]
        : []),
      ...dateWarnings,
      ...(!merchant
        ? [
            bankSlip
              ? "Recipient could not be identified. Enter who you paid."
              : "Merchant could not be identified.",
          ]
        : []),
      ...(!date ? ["Choose the purchase date; a single unambiguous date was not found."] : []),
      ...(!total ? ["Enter the total; a single clear total was not found."] : []),
    ],
  };
}
