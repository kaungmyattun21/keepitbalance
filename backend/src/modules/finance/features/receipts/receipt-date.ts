import { calendarDateSchema } from "@keepitbalance/shared/schemas";

const monthNames: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
  มค: 1,
  กพ: 2,
  มีค: 3,
  เมย: 4,
  พค: 5,
  มิย: 6,
  กค: 7,
  สค: 8,
  กย: 9,
  ตค: 10,
  พย: 11,
  ธค: 12,
  มกราคม: 1,
  กุมภาพันธ์: 2,
  มีนาคม: 3,
  เมษายน: 4,
  พฤษภาคม: 5,
  มิถุนายน: 6,
  กรกฎาคม: 7,
  สิงหาคม: 8,
  กันยายน: 9,
  ตุลาคม: 10,
  พฤศจิกายน: 11,
  ธันวาคม: 12,
};

export function findReceiptDate(text: string) {
  const candidates = new Set<string>();
  const warnings = new Set<string>();
  const dayFirst = /[\u0E01-\u0E2E]/.test(text);
  const add = (year: number, month: number, day: number) => {
    if (year < 100) {
      if (dayFirst) {
        warnings.add("A two-digit Thai year could be Gregorian or Buddhist; choose the purchase date.");
        return;
      }
      year += 2000;
      warnings.add("A two-digit year was interpreted as 20xx; check the purchase date.");
    }
    if (year >= 2400 && year <= 2800) {
      year -= 543;
      warnings.add("A Buddhist calendar year was converted; check the purchase date.");
    }
    const value = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (calendarDateSchema.safeParse(value).success) candidates.add(value);
  };
  for (const match of text.matchAll(/(?<!\d)(\d{4})([-/.])(\d{1,2})\2(\d{1,2})(?!\d)/g)) {
    add(Number(match[1]), Number(match[3]), Number(match[4]));
  }
  for (const match of text.matchAll(/(?<![\d/.-])(\d{1,2})([-/.])(\d{1,2})\2(\d{4}|\d{2})(?!\d)/g)) {
    const first = Number(match[1]);
    const second = Number(match[3]);
    const year = Number(match[4]);
    if (dayFirst && first <= 12 && second <= 12 && first !== second && year < 2400) {
      warnings.add("The numeric date was interpreted as day/month using Thai text; check the purchase date.");
    }
    if (first > 12 || dayFirst || year >= 2400 || first === second) add(year, second, first);
    else if (second > 12) add(year, first, second);
    else warnings.add("The numeric date could be day/month or month/day; choose the purchase date.");
  }
  for (const match of text.matchAll(
    /(?<!\d)(\d{1,2})\s+([a-z\u0E01-\u0E4E.]+)\s*,?\s*(\d{4}|\d{2})(?!\d)/gi,
  )) {
    const month = monthNames[match[2]!.toLowerCase().replaceAll(".", "")];
    if (month) add(Number(match[3]), month, Number(match[1]));
  }
  for (const match of text.matchAll(/\b([a-z]+)\s+(\d{1,2}),?\s+(\d{4}|\d{2})(?!\d)/gi)) {
    const month = monthNames[match[1]!.toLowerCase()];
    if (month) add(Number(match[3]), month, Number(match[2]));
  }
  const ambiguous = warnings.has(
    "The numeric date could be day/month or month/day; choose the purchase date.",
  );
  return { date: candidates.size === 1 && !ambiguous ? [...candidates][0]! : null, warnings: [...warnings] };
}
