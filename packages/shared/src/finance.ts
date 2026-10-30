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

export type Category = { id: string; name: string; type: TransactionType; groupId: string };

export type CategoryGroup = {
  id: string;
  name: string;
  type: TransactionType;
  categories: Category[];
};

const categoryNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(100, "Name must be at most 100 characters.");
export const categoryParamsSchema = z.object({ id: z.uuid("Invalid category or group id.") });
export const createCategoryGroupSchema = z.object({ name: categoryNameSchema, type: transactionTypeSchema });
export const updateCategoryGroupSchema = z.object({ name: categoryNameSchema });
export const createCategorySchema = z.object({
  name: categoryNameSchema,
  groupId: z.uuid("Choose a group."),
});
export const updateCategorySchema = createCategorySchema
  .partial()
  .refine((value) => value.name !== undefined || value.groupId !== undefined, "Provide a name or group.");
export type CreateCategoryGroupValues = z.output<typeof createCategoryGroupSchema>;
export type UpdateCategoryGroupValues = z.output<typeof updateCategoryGroupSchema>;
export type CreateCategoryValues = z.output<typeof createCategorySchema>;
export type UpdateCategoryValues = z.output<typeof updateCategorySchema>;

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

export type BudgetGroup = {
  group: { id: string; name: string };
  amount: string;
  spent: string;
  remaining: string;
  budgets: Budget[];
};

export type MonthlyBudgets = {
  month: string;
  totalBudget: string;
  totalSpent: string;
  groups: BudgetGroup[];
};

export const billFrequencySchema = z.enum(["weekly", "monthly", "yearly"]);
export type BillFrequency = z.output<typeof billFrequencySchema>;
export const billParamsSchema = z.object({ id: z.uuid("Invalid bill id.") });
export const createBillSchema = z.object({
  name: z.string().trim().min(1, "Enter a bill name.").max(100, "Name must be at most 100 characters."),
  amount: positiveMoneySchema,
  categoryId: z.uuid("Choose an expense category."),
  frequency: billFrequencySchema,
  nextDueDate: calendarDateSchema,
});
export const updateBillSchema = createBillSchema.extend({ updatedAt: z.iso.datetime() });
export const payBillSchema = z.object({
  dueDate: calendarDateSchema,
  date: calendarDateSchema,
  amount: positiveMoneySchema,
  updatedAt: z.iso.datetime(),
});
export type CreateBillInput = z.input<typeof createBillSchema>;
export type CreateBillValues = z.output<typeof createBillSchema>;
export type UpdateBillValues = z.output<typeof updateBillSchema>;
export type PayBillInput = z.input<typeof payBillSchema>;
export type PayBillValues = z.output<typeof payBillSchema>;
export type Bill = {
  id: string;
  name: string;
  amount: string;
  category: Category;
  frequency: BillFrequency;
  nextDueDate: string;
  lastPaidDate: string | null;
  updatedAt: string;
};
export type BillPaymentResult = { bill: Bill; transactionId: string };
