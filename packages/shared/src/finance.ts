import { z } from "zod";
import { calendarDateSchema, moneySchema, monthSchema, paginationQuerySchema } from "./schemas.ts";

export const NOTE_MAX_LENGTH = 500;

const positiveMoneySchema = moneySchema.refine(
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
