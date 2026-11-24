import { NOTE_MAX_LENGTH, type TransactionType } from "./finance.ts";

export type QuickEntry = {
  amount?: string;
  date?: string;
  type?: TransactionType;
  note?: string;
};

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const INCOME = /\b(?:salary|income|got paid|paid me|received|refund(?:ed)?|bonus|earned|sold)\b/i;
const CURRENCY_WORD = "baht|bucks|dollars?|thb|usd";
const AMOUNT = new RegExp(
  // Speech recognition writes thousands with a comma or a space: "23,000" or "23 000".
  String.raw`(?<![\w.,])[$฿]?\s?(\d{1,3}(?:[, ]\d{3})+(?!\d)|\d+)(?:\.(\d{1,2}))?(?:\s?(${CURRENCY_WORD}))?(?!\w)`,
  "gi",
);
const LEADING_WORDS =
  /^(?:(?:i|and|then|just)\s+)*(?:spent|paid|bought|got paid|received|earned|expense|income|for|on|at|of|a|an|the)\b\s*/i;
const TRAILING_WORDS = /\s*\b(?:for|on|at|of|and)$/i;

function shiftDay(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function findDate(text: string, today: string): { date: string; phrase: string } | null {
  const relative: [RegExp, (match: RegExpExecArray) => string][] = [
    [/\b(?:the\s+)?day before yesterday\b/i, () => shiftDay(today, -2)],
    [/\byesterday\b/i, () => shiftDay(today, -1)],
    [/\btoday\b/i, () => today],
    [/\b(\d{1,2})\s+days?\s+ago\b/i, (match) => shiftDay(today, -Number(match[1]))],
    [
      new RegExp(String.raw`\b(last|on)?\s*(${WEEKDAYS.join("|")})\b`, "i"),
      (match) => {
        const target = WEEKDAYS.indexOf(match[2]!.toLowerCase());
        let back = (weekdayOf(today) - target + 7) % 7;
        if (back === 0 && match[1]?.toLowerCase() === "last") back = 7;
        return shiftDay(today, -back);
      },
    ],
  ];
  for (const [pattern, resolve] of relative) {
    const match = pattern.exec(text);
    if (match) return { date: resolve(match), phrase: match[0] };
  }
  return null;
}

function findAmount(text: string): { amount: string; phrase: string } | null {
  const candidates = [...text.matchAll(AMOUNT)].map((match) => {
    const whole = match[1]!.replace(/[, ]/g, "");
    return {
      phrase: match[0],
      value: Number(`${whole}.${match[2] ?? "0"}`),
      amount: `${whole}${match[2] ? `.${match[2].padEnd(2, "0")}` : ""}`,
      labelled: Boolean(match[3]) || /^[$฿]/.test(match[0].trim()),
    };
  });
  const valid = candidates.filter((candidate) => candidate.value > 0);
  if (!valid.length) return null;
  // "2 coffees 170": a currency label wins, otherwise the largest number is the price.
  const labelled = valid.filter((candidate) => candidate.labelled);
  const pool = labelled.length ? labelled : valid;
  const best = pool.reduce((largest, candidate) => (candidate.value > largest.value ? candidate : largest));
  return { amount: best.amount, phrase: best.phrase };
}

function cleanNote(text: string): string | undefined {
  let note = text.replace(/\s+/g, " ").trim();
  for (let previous = ""; previous !== note;) {
    previous = note;
    note = note.replace(LEADING_WORDS, "").replace(TRAILING_WORDS, "").trim();
  }
  if (!note) return undefined;
  return (note[0]!.toUpperCase() + note.slice(1)).slice(0, NOTE_MAX_LENGTH);
}

export function parseQuickEntry(text: string, today: string): QuickEntry {
  let rest = text.trim();
  const entry: QuickEntry = {};

  if (INCOME.test(rest)) entry.type = "income";
  else if (/\b(?:spent|paid|bought|expense)\b/i.test(rest)) entry.type = "expense";

  const date = findDate(rest, today);
  if (date) {
    entry.date = date.date;
    rest = rest.replace(date.phrase, " ");
  }

  const amount = findAmount(rest);
  if (amount) {
    entry.amount = amount.amount;
    rest = rest.replace(amount.phrase, " ");
  }

  const note = cleanNote(rest);
  if (note) entry.note = note;
  return entry;
}
