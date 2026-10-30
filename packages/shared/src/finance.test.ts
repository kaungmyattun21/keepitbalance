import { describe, expect, it } from "vitest";
import {
  createBillSchema,
  updateBillSchema,
  payBillSchema,
  createCategorySchema,
  createCategoryGroupSchema,
  updateCategorySchema,
  budgetsQuerySchema,
  createTransactionSchema,
  replaceBudgetsSchema,
  listTransactionsQuerySchema,
  transactionParamsSchema,
  transactionSummaryQuerySchema,
} from "./finance.ts";

const valid = {
  type: "income",
  amount: "100.00",
  date: "2023-06-15",
  categoryId: "123e4567-e89b-12d3-a456-426614174000",
  note: "Test transaction",
};

const accepts = (input: object) => createTransactionSchema.safeParse(input).success;

describe("createTransactionSchema", () => {
  it("accepts valid input", () => {
    expect(accepts(valid)).toBe(true);
  });

  describe("amount", () => {
    it.each(["0", "0.0", "0.00"])("rejects zero written as %j", (amount) => {
      expect(accepts({ ...valid, amount })).toBe(false);
    });

    it.each(["12.345", "-5", "abc", ""])("rejects %j", (amount) => {
      expect(accepts({ ...valid, amount })).toBe(false);
    });

    it("rejects a number instead of a string", () => {
      expect(accepts({ ...valid, amount: 100 })).toBe(false);
    });

    it("normalizes to two decimals", () => {
      expect(createTransactionSchema.parse({ ...valid, amount: "5" }).amount).toBe("5.00");
      expect(createTransactionSchema.parse({ ...valid, amount: "0.5" }).amount).toBe("0.50");
    });
  });

  describe("date", () => {
    it.each(["2023-02-30", "2023-13-01", "15/06/2023", "2023-06-15T10:00:00Z"])("rejects %j", (date) => {
      expect(accepts({ ...valid, date })).toBe(false);
    });
  });

  describe("type", () => {
    it.each(["INCOME", "transfer", ""])("rejects %j", (type) => {
      expect(accepts({ ...valid, type })).toBe(false);
    });
  });

  it("rejects a category id that isn't a UUID", () => {
    expect(accepts({ ...valid, categoryId: "not-a-uuid" })).toBe(false);
  });

  it.each(["type", "amount", "date", "categoryId"])("requires %s", (field) => {
    const { [field as keyof typeof valid]: _removed, ...input } = valid;
    expect(accepts(input)).toBe(false);
  });

  describe("note", () => {
    it("is optional", () => {
      const { note: _note, ...withoutNote } = valid;
      expect(createTransactionSchema.parse(withoutNote).note).toBeUndefined();
    });

    it.each(["", "   "])("treats %j as no note", (note) => {
      expect(createTransactionSchema.parse({ ...valid, note }).note).toBeUndefined();
    });

    it("trims surrounding whitespace", () => {
      expect(createTransactionSchema.parse({ ...valid, note: "  rent  " }).note).toBe("rent");
    });

    it("allows 500 characters and rejects 501", () => {
      expect(accepts({ ...valid, note: "a".repeat(500) })).toBe(true);
      expect(accepts({ ...valid, note: "a".repeat(501) })).toBe(false);
    });
  });

  it("drops fields that aren't part of the schema, such as userId", () => {
    const parsed = createTransactionSchema.parse({ ...valid, userId: "someone-else" });
    expect(parsed).not.toHaveProperty("userId");
  });
});

describe("listTransactionsQuerySchema", () => {
  it("applies the pagination defaults and leaves month and type optional", () => {
    expect(listTransactionsQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it("coerces query-string numbers and keeps the filters", () => {
    expect(
      listTransactionsQuerySchema.parse({ page: "2", pageSize: "50", month: "2026-09", type: "income" }),
    ).toEqual({ page: 2, pageSize: 50, month: "2026-09", type: "income" });
  });

  it.each([
    { month: "2026-13" },
    { month: "2026-9" },
    { type: "savings" },
    { pageSize: "101" },
    { page: "0" },
  ])("rejects %o", (query) => {
    expect(listTransactionsQuerySchema.safeParse(query).success).toBe(false);
  });
});

describe("transactionParamsSchema", () => {
  it("accepts a UUID and rejects anything else", () => {
    expect(transactionParamsSchema.safeParse({ id: "123e4567-e89b-12d3-a456-426614174000" }).success).toBe(
      true,
    );
    expect(transactionParamsSchema.safeParse({ id: "abc" }).success).toBe(false);
  });
});

describe("transactionSummaryQuerySchema", () => {
  it("leaves month and type optional", () => {
    expect(transactionSummaryQuerySchema.parse({})).toEqual({});
    expect(transactionSummaryQuerySchema.parse({ month: "2026-09", type: "expense" })).toEqual({
      month: "2026-09",
      type: "expense",
    });
  });

  it.each([{ month: "2026-13" }, { type: "savings" }])("rejects %o", (query) => {
    expect(transactionSummaryQuerySchema.safeParse(query).success).toBe(false);
  });
});

describe("replaceBudgetsSchema", () => {
  const groceriesId = "123e4567-e89b-12d3-a456-426614174000";
  const transportId = "123e4567-e89b-12d3-a456-426614174001";

  it("normalizes amounts and keeps them otherwise as entered", () => {
    expect(replaceBudgetsSchema.parse({ budgets: [{ categoryId: groceriesId, amount: "412.3" }] })).toEqual({
      budgets: [{ categoryId: groceriesId, amount: "412.30" }],
    });
  });

  it("accepts an empty list, which removes every budget", () => {
    expect(replaceBudgetsSchema.parse({ budgets: [] })).toEqual({ budgets: [] });
  });

  it("rejects the same category twice", () => {
    const result = replaceBudgetsSchema.safeParse({
      budgets: [
        { categoryId: groceriesId, amount: "100" },
        { categoryId: groceriesId, amount: "200" },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Each category can have only one budget.");
  });

  it.each(["0", "-5", "12.345", "abc"])("rejects the amount %s", (amount) => {
    expect(replaceBudgetsSchema.safeParse({ budgets: [{ categoryId: transportId, amount }] }).success).toBe(
      false,
    );
  });

  it("validates the month query", () => {
    expect(budgetsQuerySchema.parse({})).toEqual({});
    expect(budgetsQuerySchema.safeParse({ month: "2026-13" }).success).toBe(false);
  });
});

describe("category management validation", () => {
  it("requires a valid group when creating a category", () => {
    expect(createCategorySchema.safeParse({ name: "Groceries" }).success).toBe(false);
    expect(createCategorySchema.safeParse({ name: "Groceries", groupId: null }).success).toBe(false);
    expect(createCategorySchema.parse({ name: " Groceries ", groupId: valid.categoryId })).toEqual({
      name: "Groceries",
      groupId: valid.categoryId,
    });
  });
  it("rejects empty and overlong names and empty updates", () => {
    for (const name of ["  ", "a".repeat(101)]) {
      expect(createCategoryGroupSchema.safeParse({ name, type: "expense" }).success).toBe(false);
    }
    expect(updateCategorySchema.safeParse({}).success).toBe(false);
    expect(updateCategorySchema.safeParse({ groupId: null }).success).toBe(false);
    expect(updateCategorySchema.safeParse({ groupId: valid.categoryId }).success).toBe(true);
  });
});

describe("bill schemas", () => {
  const bill = {
    name: " Rent ",
    amount: "1200.5",
    categoryId: valid.categoryId,
    nextDueDate: "2026-01-31",
    frequency: "monthly",
  };
  it("normalizes names and amounts and accepts supported schedules", () => {
    expect(createBillSchema.parse(bill)).toMatchObject({ name: "Rent", amount: "1200.50" });
    for (const frequency of ["weekly", "monthly", "yearly"])
      expect(createBillSchema.safeParse({ ...bill, frequency }).success).toBe(true);
  });
  it("requires valid expense amounts, dates, category ids and a name", () => {
    for (const override of [
      { amount: "0" },
      { amount: "1.234" },
      { name: " " },
      { categoryId: "unknown" },
      { nextDueDate: "2026-02-30" },
      { frequency: "daily" },
    ])
      expect(createBillSchema.safeParse({ ...bill, ...override }).success).toBe(false);
  });
  it("requires an occurrence and version for payments and a version for edits", () => {
    expect(updateBillSchema.safeParse(bill).success).toBe(false);
    expect(payBillSchema.safeParse({ amount: "10", date: "2026-02-01" }).success).toBe(false);
    expect(
      payBillSchema.parse({
        amount: "10",
        date: "2026-02-01",
        dueDate: "2026-01-31",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }).amount,
    ).toBe("10.00");
  });
});
