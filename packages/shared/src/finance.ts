import { z } from "zod";
import { calendarDateSchema, moneySchema, monthSchema, paginationQuerySchema } from "./schemas.ts";

export const NOTE_MAX_LENGTH = 500;

export const positiveMoneySchema = moneySchema.refine(
  (amount) => amount !== "0.00",
  "Amount must be greater than 0.",
);

const noteSchema = z
  .string()
  .trim()
  .max(NOTE_MAX_LENGTH, `Note must be at most ${NOTE_MAX_LENGTH} characters.`)
  .transform((note) => note || undefined)
  .optional();

export const transactionTypeSchema = z.enum(
  ["income", "expense"],
  "Type must be either 'income' or 'expense'.",
);

export type TransactionType = z.infer<typeof transactionTypeSchema>;

export type Category = { id: string; name: string; type: TransactionType };

export const listCategoriesQuerySchema = z.object({ type: transactionTypeSchema.optional() });

export type ListCategoriesQuery = z.output<typeof listCategoriesQuerySchema>;

export const createTransactionSchema = z.object({
  type: transactionTypeSchema,
  amount: positiveMoneySchema,
  date: calendarDateSchema,
  categoryId: z.uuid("Choose a category."),
  note: noteSchema,
});

export type CreateTransactionInput = z.input<typeof createTransactionSchema>;
export type CreateTransactionValues = z.output<typeof createTransactionSchema>;

// PUT replaces the whole transaction, so it takes the same fields as create.
export const updateTransactionSchema = createTransactionSchema;

export type UpdateTransactionValues = z.output<typeof updateTransactionSchema>;

export const transactionParamsSchema = z.object({ id: z.uuid("Invalid transaction id.") });

export type TransactionParams = z.output<typeof transactionParamsSchema>;

export const listTransactionsQuerySchema = paginationQuerySchema.extend({
  month: monthSchema.optional(),
  type: transactionTypeSchema.optional(),
});

export type ListTransactionsQuery = z.output<typeof listTransactionsQuerySchema>;

export const transactionSummaryQuerySchema = z.object({
  month: monthSchema.optional(),
  type: transactionTypeSchema.optional(),
});

export type TransactionSummaryQuery = z.output<typeof transactionSummaryQuerySchema>;

export type CategoryTotal = {
  categoryId: string;
  name: string;
  type: TransactionType;
  total: string;
};

export type TransactionSummary = {
  month: string;
  totalIncome: string;
  totalExpense: string;
  net: string;
  byCategory: CategoryTotal[];
};

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: string;
  date: string;
  note: string | null;
  category: Category;
  shoppingListId: string | null;
  createdAt: string;
  updatedAt: string;
};

export const BUDGETS_MAX = 100;

export const budgetsQuerySchema = z.object({ month: monthSchema.optional() });

export type BudgetsQuery = z.output<typeof budgetsQuerySchema>;

export const budgetEntrySchema = z.object({
  categoryId: z.uuid("Choose a category."),
  amount: positiveMoneySchema,
});

export const replaceBudgetsSchema = z.object({
  budgets: z
    .array(budgetEntrySchema)
    .max(BUDGETS_MAX, `At most ${BUDGETS_MAX} budgets.`)
    .refine(
      (entries) => new Set(entries.map((entry) => entry.categoryId)).size === entries.length,
      "Each category can have only one budget.",
    ),
});

export type ReplaceBudgetsInput = z.input<typeof replaceBudgetsSchema>;
export type ReplaceBudgetsValues = z.output<typeof replaceBudgetsSchema>;

export type Budget = {
  id: string;
  category: Category;
  amount: string;
  spent: string;
  remaining: string;
};

export type MonthlyBudgets = {
  month: string;
  totalBudget: string;
  totalSpent: string;
  data: Budget[];
};
