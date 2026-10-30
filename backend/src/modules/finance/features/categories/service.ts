import type {
  Category,
  CategoryGroup,
  ListCategoriesQuery,
  CreateCategoryGroupValues,
  UpdateCategoryGroupValues,
  CreateCategoryValues,
  UpdateCategoryValues,
} from "@keepitbalance/shared/finance";
import { Prisma } from "../../../../generated/prisma/client.ts";
import { badRequest, conflict, notFound } from "../../../../shared/errors.ts";
import { toApiType, toDbType } from "../../shared/transaction-type.ts";
import * as repository from "./repository.ts";

const DEFAULT_CATEGORY_GROUPS = [
  { type: "EXPENSE", name: "Essentials", categories: ["Housing", "Bills", "Groceries", "Transport"] },
  { type: "EXPENSE", name: "Lifestyle", categories: ["Eating out", "Other"] },
  { type: "INCOME", name: "Income", categories: ["Salary", "Other"] },
] as const;

type CategoryRow = Awaited<ReturnType<typeof repository.findMany>>[number];
type GroupRow = Awaited<ReturnType<typeof repository.findGroups>>[number];
const categoryResponse = (row: CategoryRow): Category => ({ ...row, type: toApiType[row.type] });
const groupResponse = (row: GroupRow): CategoryGroup => ({
  ...row,
  type: toApiType[row.type],
  categories: row.categories.map(categoryResponse),
});

export async function createDefaultCategories(userId: string): Promise<void> {
  await repository.createDefaults(userId, DEFAULT_CATEGORY_GROUPS);
}

export async function listCategories(userId: string, query: ListCategoriesQuery): Promise<Category[]> {
  return (await repository.findMany(userId, query.type && toDbType[query.type])).map(categoryResponse);
}

export async function listGroups(userId: string, query: ListCategoriesQuery): Promise<CategoryGroup[]> {
  return (await repository.findGroups(userId, query.type && toDbType[query.type])).map(groupResponse);
}

async function requireGroup(userId: string, id: string) {
  const group = await repository.findGroup(userId, id);
  if (!group) throw notFound("Group not found");
  return group;
}

async function requireCategory(userId: string, id: string) {
  const category = await repository.findCategory(userId, id);
  if (!category) throw notFound("Category not found");
  return category;
}
// Database constraints also protect operations racing with category moves or new transactions.
async function mutate<T>(
  operation: () => Promise<T>,
  foreignKeyCode: "GROUP_NOT_EMPTY" | "CATEGORY_IN_USE" | "CATEGORY_TYPE_MISMATCH",
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") throw conflict("DUPLICATE_NAME", "That name already exists for this type.");
      if (error.code === "P2003") {
        if (foreignKeyCode === "CATEGORY_TYPE_MISMATCH")
          throw badRequest(foreignKeyCode, "The group changed. Choose a group of the same type.");
        throw conflict(
          foreignKeyCode,
          foreignKeyCode === "GROUP_NOT_EMPTY"
            ? "Move or delete the categories before deleting this group."
            : "This category is used by transactions, budgets or bills.",
        );
      }
    }
    throw error;
  }
}

export async function createGroup(userId: string, input: CreateCategoryGroupValues) {
  return groupResponse(
    await mutate(
      () => repository.createGroup(userId, input.name, toDbType[input.type]),
      "CATEGORY_TYPE_MISMATCH",
    ),
  );
}

export async function updateGroup(userId: string, id: string, input: UpdateCategoryGroupValues) {
  await requireGroup(userId, id);
  return groupResponse(
    await mutate(() => repository.updateGroup(userId, id, input.name), "CATEGORY_TYPE_MISMATCH"),
  );
}

export async function deleteGroup(userId: string, id: string) {
  await requireGroup(userId, id);
  await mutate(() => repository.deleteGroup(userId, id), "GROUP_NOT_EMPTY");
}

export async function createCategory(userId: string, input: CreateCategoryValues) {
  const group = await requireGroup(userId, input.groupId);
  return categoryResponse(
    await mutate(
      () => repository.createCategory(userId, input.name, group.id, group.type),
      "CATEGORY_TYPE_MISMATCH",
    ),
  );
}

export async function updateCategory(userId: string, id: string, input: UpdateCategoryValues) {
  const category = await requireCategory(userId, id);
  if (input.groupId) {
    const group = await requireGroup(userId, input.groupId);
    if (category.type !== group.type)
      throw badRequest("CATEGORY_TYPE_MISMATCH", "Choose a group of the same type.");
  }
  return categoryResponse(
    await mutate(() => repository.updateCategory(userId, id, input), "CATEGORY_TYPE_MISMATCH"),
  );
}

export async function deleteCategory(userId: string, id: string) {
  await requireCategory(userId, id);
  await mutate(() => repository.deleteCategory(userId, id), "CATEGORY_IN_USE");
}
