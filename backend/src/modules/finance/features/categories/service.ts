import * as repository from "./repository.ts";

const DEFAULT_CATEGORIES = [
  { type: "EXPENSE", name: "Groceries" },
  { type: "EXPENSE", name: "Housing" },
  { type: "EXPENSE", name: "Transport" },
  { type: "EXPENSE", name: "Bills" },
  { type: "EXPENSE", name: "Eating out" },
  { type: "EXPENSE", name: "Other" },
  { type: "INCOME", name: "Salary" },
  { type: "INCOME", name: "Other" },
] as const;

export async function createDefaultCategories(userId: string): Promise<void> {
  await repository.createMany(userId, [...DEFAULT_CATEGORIES]);
}
