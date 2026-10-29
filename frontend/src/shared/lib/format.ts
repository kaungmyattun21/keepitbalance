type MoneyOptions = {
  currency?: string;
  locale?: string;
};

export function formatMoney(amount: string, { currency, locale }: MoneyOptions = {}): string {
  const formatter = new Intl.NumberFormat(locale, {
    ...(currency ? { style: "currency", currency } : { style: "decimal" }),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount as Intl.StringNumericLiteral);
}

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH = /^(\d{4})-(\d{2})$/;

// Formatted as a UTC date so no timezone can shift the day.
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
