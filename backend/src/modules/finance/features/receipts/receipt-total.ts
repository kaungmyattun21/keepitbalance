import { moneySchema } from "@keepitbalance/shared/schemas";

const currency = /(?:US\$|THB|USD|GBP|EUR|BAHT|บาท|[$฿£€])/gi;
const ignored =
  /\b(?:sub\s*total|subtotal|tax|vat|cash|change|tendered|savings?|discount|balance\s+(?:before|after))\b|ยอดก่อน|ภาษี|เงินทอน|ค่าธรรมเนียม|ส่วนลด/i;
const pricePattern =
  /(?<![\d.,])(?:\d{1,3}(?:[ ,]\d{3})+\.\d{2}|\d{1,3}(?:\.\d{3})+,\d{2}|\d+[.,]\d{2})(?![\d.,])/g;

function amounts(text: string): string[] {
  const clean = text.replace(currency, "").replace(/(?<=\d)\s*([.,])\s*(?=\d)/g, "$1");
  const matches = [...clean.matchAll(pricePattern)]
    .filter((match) => !/[-−(]\s*$/.test(clean.slice(0, match.index)))
    .map((match) => match[0]);
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
  const paymentContext =
    lines.some((line) => /^[^\p{L}\p{N}]*(?:VAT|AT)\b.*\d|\bVAT\s+INCLUDED\b/iu.test(line)) &&
    lines.some((line) => /^[^\p{L}\p{N}]*(?:CASH|ASH)\b.*\d/iu.test(line));
  for (const [index, original] of lines.entries()) {
    const line = original.replace(/^[^\p{L}\p{N}-]+/u, "");
    if (ignored.test(line)) continue;
    const label =
      /^(?:grand\s+total|total\s+(?:amount|due|payable)|amount\s+due|balance\s+due|ยอดรวมสุทธิ|ยอดชำระสุทธิ|ยอดสุทธิ|ยอดชำระ|ยอดที่ต้องชำระ|จำนวนเงินรวมทั้งสิ้น|จำนวนเงินทั้งสิ้น|จำนวนเงินรวม|รวมทั้งสิ้น|รวมสุทธิ|ยอดเงินสุทธิ|รวมเป็นเงิน|ยอดเงินรวม)/i.exec(
        line,
      ) ??
      /^(?:total\b|ยอดรวม|รวมเงิน)/i.exec(line) ??
      (bankSlip ? /^(?:amount\b|จำนวนเงิน|ยอดเงิน)/i.exec(line) : null) ??
      (paymentContext ? /^OTAL?\b/i.exec(line) : null) ??
      /^amount\b/i.exec(line);
    if (!label) continue;
    const remainder = line.slice(label[0].length);
    if (
      !/^OTAL?$/i.test(label[0]) &&
      /[a-z\u0E01-\u0E2E]/i.test(remainder.replace(currency, "").replace(/\s+[A-Z]$/, ""))
    )
      continue;
    // A lone AMOUNT label on a receipt is often a column heading, so its value must share the line.
    const sameLineOnly = !bankSlip && /^amount$/i.test(label[0]);
    let found = amounts(remainder);
    if (!found.length && !sameLineOnly && !remainder.replace(currency, "").replace(/[:=*()\s]/g, "")) {
      // Some OCR layouts put the label above its value. Never skip another field label.
      const next = lines[index + 1] ?? "";
      if (!next.replace(currency, "").replace(/[\d.,\s:=*]/g, "")) found = amounts(next);
    }
    const rank = /^OTAL?$/i.test(label[0]) || sameLineOnly ? 0 : /^total$/i.test(label[0]) ? 1 : 2;
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
