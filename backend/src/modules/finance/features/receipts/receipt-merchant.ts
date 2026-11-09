const bankSlipPattern =
  /transfer\s+(?:successful|completed)|transaction\s+successful|โอนเงินสำเร็จ|โอนสำเร็จ|ทำรายการสำเร็จ|ผู้โอน|ผู้รับโอน|ผู้รับเงิน/i;
const recipientLabel =
  /^(?:(?:recipient|payee|to)\b|ผู้รับโอน|ผู้รับเงิน|ชื่อผู้รับ(?:เงิน)?)\s*[:：-]?\s*(.*)$/i;
const genericHeader =
  /^(?:wholesale|receipt|tax\s*invoice|invoice|thank\s*you|welcome|member|membership|cashier|register|terminal|store\s*#|tel|phone|address|date|time|vat|tax\b|total\b|subtotal|ใบเสร็จ|ใบกำกับภาษี|เลขประจำตัว|โทร|สาขา|วันที่|เวลา|ยอด|รวม|เงินทอน)/i;

export function isBankSlip(text: string) {
  return (
    bankSlipPattern.test(text) ||
    (/krungthai|กรุงไทย/i.test(text) && /recipient|sender|reference|ผู้รับ|ผู้ส่ง/i.test(text))
  );
}

export function findMerchant(lines: string[], bankSlip: boolean): string | null {
  if (bankSlip) {
    for (const [index, line] of lines.entries()) {
      const match = recipientLabel.exec(line);
      if (!match) continue;
      const value = match[1]?.trim() || lines[index + 1];
      if (
        value &&
        /[a-z\u0E01-\u0E2E]/i.test(value) &&
        !/bank|ธนาคาร|krungthai|กรุงไทย|account|บัญชี|amount|จำนวนเงิน|^[\dXx*\s-]+$/i.test(value)
      )
        return value.slice(0, 200);
    }
    return null;
  }

  // Brand evidence must appear in the header, not in a priced line item.
  const header = lines
    .slice(0, 10)
    .filter((line) => !/\d[.,]\d{2}\b/.test(line))
    .join("\n");
  if (/\bc[o0]st\s*c[o0]\b/i.test(header)) return "Costco";
  if (/\bmakr[o0]\b|แม็คโคร|แมคโคร/i.test(header)) return "Makro";

  const candidate = lines
    .slice(0, 8)
    .find(
      (line) =>
        /[a-z\u0E01-\u0E2E]{3}/i.test(line) &&
        !genericHeader.test(line) &&
        !/https?:|www\.|@|\d{3}|\d[.,]\d{2}\b|^\d+\s|^(?:road|street|avenue|thailand|bangkok)\b|^(?:ถนน|แขวง|ตำบล|อำเภอ|จังหวัด)/i.test(
          line,
        ),
    );
  return candidate?.slice(0, 200) ?? null;
}
