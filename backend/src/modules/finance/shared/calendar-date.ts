// Calendar days are stored as UTC midnight so no timezone can shift them.
export function toDbDate(calendarDate: string): Date {
  return new Date(`${calendarDate}T00:00:00Z`);
}

export function fromDbDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function monthDateRange(month: string): { from: Date; before: Date } {
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  return {
    from: new Date(Date.UTC(year, monthNumber - 1, 1)),
    before: new Date(Date.UTC(year, monthNumber, 1)),
  };
}
