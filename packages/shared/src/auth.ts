export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// Better Auth field definitions for the columns we added to `users`. Used by the server config
// (user.additionalFields) and by the browser client (inferAdditionalFields), so both agree.
export const userAdditionalFields = {
  timezone: { type: "string", required: false, defaultValue: "UTC", input: true },
} as const;

// Intl.supportedValuesOf("timeZone") omits valid names such as "UTC" and "Asia/Yangon".
export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
