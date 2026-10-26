import { z } from "zod";
import { isValidTimezone, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./auth.ts";

export const emailSchema = z.email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`);

export const timezoneSchema = z.string().refine(isValidTimezone, "Unknown timezone.");

export const uuidSchema = z.uuid("Invalid id.");

const MONEY = /^(0|[1-9]\d{0,9})(\.\d{1,2})?$/;

// Decimal(12,2) as a string, normalized to exactly two decimals ("5" → "5.00"). Never a float.
export const moneySchema = z
  .string()
  .trim()
  .regex(MONEY, "Enter an amount like 12.50.")
  .transform((value) => {
    const [whole, fraction = ""] = value.split(".");
    return `${whole}.${fraction.padEnd(2, "0")}`;
  });

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const calendarDateSchema = z.string().refine((value) => {
  const match = CALENDAR_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}, "Enter a date as YYYY-MM-DD.");

export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Enter a month as YYYY-MM.");

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
