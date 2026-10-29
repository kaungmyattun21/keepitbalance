import type { Category, ListCategoriesQuery } from "@keepitbalance/shared/finance";
import { toApiType, toDbType } from "../../shared/transaction-type.ts";
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

export async function listCategories(userId: string, query: ListCategoriesQuery): Promise<Category[]> {
  const rows = await repository.findMany(userId, query.type && toDbType[query.type]);
  return rows.map((row) => ({ id: row.id, name: row.name, type: toApiType[row.type] }));
}
