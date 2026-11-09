import { moneySchema } from "@keepitbalance/shared/schemas";

const currency = /(?:US\$|THB|USD|GBP|EUR|BAHT|บาท|[$฿£€])/gi;
const ignored =
  /\b(?:sub\s*total|subtotal|tax|vat|cash|change|tendered|savings?|discount|balance\s+(?:before|after))\b|ยอดก่อน|ภาษี|เงินทอน|ค่าธรรมเนียม|ส่วนลด/i;
const pricePattern =
  /(?<![\d.,])(?:\d{1,3}(?:[ ,]\d{3})+\.\d{2}|\d{1,3}(?:\.\d{3})+,\d{2}|\d+[.,]\d{2})(?![\d.,])/g;

function amounts(text: string): string[] {
  if (/[-−]\s*\d|\(\s*\d/.test(text.replace(currency, ""))) return [];
  const matches = [...text.matchAll(pricePattern)].map((match) => match[0]);
  // Integers are accepted only when the whole value is an amount, not an item count.
  const plain = text.replace(currency, "").replace(/[:=*\s]/g, "");
  if (!matches.length && /^\d+$/.test(plain)) matches.push(plain);
  return matches.flatMap((value) => {
    const normalized =
      value.includes(",") && value.lastIndexOf(",") > value.lastIndexOf(".") && /,\d{2}$/.test(value)
        ? value.replaceAll(".", "").replaceAll(" ", "").replace(",", ".")
        : value.replaceAll(",", "").replaceAll(" ", "");
    const parsed = moneySchema.safeParse(normalized);
    return parsed.success && parsed.data !== "0.00" ? [parsed.data] : [];
  });
}

export function findReceiptTotal(lines: string[], bankSlip: boolean) {
  const candidates: { amount: string; rank: number }[] = [];
  for (const [index, original] of lines.entries()) {
    const line = original.replace(/^[*\s:=]+/, "");
    if (ignored.test(line)) continue;
    const label =
      /^(?:grand\s+total|total\s+(?:amount|due|payable)|amount\s+due|balance\s+due|ยอดรวมสุทธิ|ยอดชำระสุทธิ|ยอดสุทธิ|ยอดชำระ|ยอดที่ต้องชำระ|จำนวนเงินรวมทั้งสิ้น|จำนวนเงินทั้งสิ้น|จำนวนเงินรวม|รวมทั้งสิ้น|รวมสุทธิ|ยอดเงินสุทธิ|รวมเป็นเงิน|ยอดเงินรวม)/i.exec(
        line,
      ) ??
      /^(?:total\b|ยอดรวม|รวมเงิน)/i.exec(line) ??
      (bankSlip ? /^(?:amount\b|จำนวนเงิน|ยอดเงิน)/i.exec(line) : null);
    if (!label) continue;
    const remainder = line.slice(label[0].length);
    if (/[a-z\u0E01-\u0E2E]/i.test(remainder.replace(currency, "").replace(/\s+[A-Z]$/, ""))) continue;
    let found = amounts(remainder);
    if (!found.length && !remainder.replace(currency, "").replace(/[:=*()\s]/g, "")) {
      // Some OCR layouts put the label above its value. Never skip another field label.
      const next = lines[index + 1] ?? "";
      if (!next.replace(currency, "").replace(/[\d.,\s:=*]/g, "")) found = amounts(next);
    }
    const rank = /^total$/i.test(label[0]) ? 1 : 2;
    for (const amount of found) candidates.push({ amount, rank });
  }
  const bestRank = Math.max(0, ...candidates.map((candidate) => candidate.rank));
  const best = [
    ...new Set(
      candidates.filter((candidate) => candidate.rank === bestRank).map((candidate) => candidate.amount),
    ),
  ];
  return best.length === 1 ? best[0]! : null;
}
