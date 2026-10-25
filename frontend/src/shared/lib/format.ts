// Display formatting for the API's value formats (docs/2-design.md §4 Conventions):
//   money      "3000.00"     decimal string, never a JS number (float precision)
//   calendar   "2026-09-27"  a day in the user's timezone, no time part
//   month      "2026-09"
//   timestamp  ISO-8601      an absolute instant, shown in the user's timezone
//
// `locale` defaults to the browser's language. Tests pass one explicitly.

type MoneyOptions = {
  currency?: string; // ISO 4217, e.g. "THB". Without it, a plain number with 2 decimals.
  locale?: string;
};

export function formatMoney(amount: string, { currency, locale }: MoneyOptions = {}): string {
  const formatter = new Intl.NumberFormat(locale, {
    ...(currency ? { style: "currency", currency } : { style: "decimal" }),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  // Intl formats decimal strings exactly, without converting them to floats.
  return formatter.format(amount as Intl.StringNumericLiteral);
}

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH = /^(\d{4})-(\d{2})$/;

// A calendar day stays the same day everywhere: format it as a UTC date so no timezone can shift it.
// (new Date("2026-09-27") would be midnight UTC, i.e. still the 26th in America/New_York.)
export function formatCalendarDate(
  date: string,
  { locale, style = "medium" }: { locale?: string; style?: "short" | "medium" | "long" | "full" } = {},
): string {
  const match = CALENDAR_DATE.exec(date);
  if (!match) throw new RangeError(`Expected YYYY-MM-DD, got "${date}"`);
  const [, year, month, day] = match;
  return new Intl.DateTimeFormat(locale, { dateStyle: style, timeZone: "UTC" }).format(
    new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))),
  );
}

export function formatMonth(month: string, { locale }: { locale?: string } = {}): string {
  const match = MONTH.exec(month);
  if (!match) throw new RangeError(`Expected YYYY-MM, got "${month}"`);
  const [, year, monthNumber] = match;
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(Number(year), Number(monthNumber) - 1, 1)),
  );
}

export function formatDateTime(iso: string, timeZone: string, { locale }: { locale?: string } = {}): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone }).format(
    new Date(iso),
  );
}

// "Today" and "this month" as the API expects them: in the user's timezone, not the browser's or UTC's.
export function todayIn(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function currentMonthIn(timeZone: string, now: Date = new Date()): string {
  return todayIn(timeZone, now).slice(0, 7);
}
