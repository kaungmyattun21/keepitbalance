export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "CATEGORY_TYPE_MISMATCH",
  "UNAUTHORIZED",
  "NOT_FOUND",
  "CONFLICT",
  "CATEGORY_IN_USE",
  "GROUP_NOT_EMPTY",
  "BILL_CHANGED",
  "INGREDIENT_IN_USE",
  "INGREDIENT_UNIT_IN_USE",
  "RESOURCE_CHANGED",
  "SHOPPING_LIST_CLOSED",
  "SHOPPING_LIST_EXISTS",
  "NO_CHECKED_ITEMS",
  "INSUFFICIENT_STOCK",
  "DUPLICATE_NAME",
  "TRANSACTION_FROM_SHOPPING",
  "INTERNAL_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type ValidationIssue = {
  location: "params" | "query" | "body";
  path: string;
  message: string;
};

export type ApiErrorBody = {
  error: { code: ErrorCode; message: string; details?: ValidationIssue[] | unknown };
};

export type Page<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AuthConfig = {
  google: boolean;
};

export type Profile = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  dailyCalorieGoal: number;
  dailyWaterGoalMl: number;
  timezone: string;
  createdAt: string;
};
