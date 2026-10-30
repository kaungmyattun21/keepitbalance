import type {
  Bill,
  BillFrequency,
  BillPaymentResult,
  CreateBillValues,
  PayBillValues,
  UpdateBillValues,
} from "@keepitbalance/shared/finance";
import { Prisma } from "../../../../generated/prisma/client.ts";
import { badRequest, conflict, notFound } from "../../../../shared/errors.ts";
import { toDbDate } from "../../shared/calendar-date.ts";
import { toBillResponse } from "./bill-response.ts";
import { nextBillDate } from "./recurrence.ts";
import * as repository from "./repository.ts";

const toDbFrequency = { weekly: "WEEKLY", monthly: "MONTHLY", yearly: "YEARLY" } as const;
const changed = () =>
  conflict(
    "BILL_CHANGED",
    "This bill changed or was already paid. Close this form and reopen it to use the latest details.",
  );

async function requireBill(userId: string, id: string) {
  const bill = await repository.findBill(userId, id);
  if (!bill) throw notFound("Bill not found");
  return bill;
}

async function requireExpenseCategory(userId: string, id: string) {
  const category = await repository.findCategory(userId, id);
  if (!category) throw notFound("Category not found");
  if (category.type !== "EXPENSE") throw badRequest("CATEGORY_TYPE_MISMATCH", "Choose an expense category.");
}

async function writeBill<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003")
      throw notFound("The category changed. Choose an expense category again.");
    throw error;
  }
}

export async function listBills(userId: string): Promise<Bill[]> {
  return (await repository.findMany(userId)).map(toBillResponse);
}

export async function createBill(userId: string, input: CreateBillValues): Promise<Bill> {
  await requireExpenseCategory(userId, input.categoryId);
  return toBillResponse(
    await writeBill(() =>
      repository.createBill({
        userId,
        name: input.name,
        amount: input.amount,
        categoryId: input.categoryId,
        frequency: toDbFrequency[input.frequency],
        nextDueDate: toDbDate(input.nextDueDate),
        recurrenceAnchor: toDbDate(input.nextDueDate),
      }),
    ),
  );
}

export async function updateBill(userId: string, id: string, input: UpdateBillValues): Promise<Bill> {
  const existing = await requireBill(userId, id);
  if (existing.updatedAt.toISOString() !== input.updatedAt) throw changed();
  await requireExpenseCategory(userId, input.categoryId);
  const nextDueDate = toDbDate(input.nextDueDate);
  const frequency = toDbFrequency[input.frequency];
  const row = await writeBill(() =>
    repository.updateBill(userId, id, existing.updatedAt, {
      name: input.name,
      amount: input.amount,
      categoryId: input.categoryId,
      frequency,
      nextDueDate,
      recurrenceAnchor:
        existing.frequency !== frequency || existing.nextDueDate.getTime() !== nextDueDate.getTime()
          ? nextDueDate
          : existing.recurrenceAnchor,
    }),
  );
  if (!row) throw changed();
  return toBillResponse(row);
}

export async function deleteBill(userId: string, id: string): Promise<void> {
  const result = await repository.deleteBill(userId, id);
  if (!result.count) throw notFound("Bill not found");
}

export async function payBill(userId: string, id: string, input: PayBillValues): Promise<BillPaymentResult> {
  const existing = await requireBill(userId, id);
  if (
    existing.updatedAt.toISOString() !== input.updatedAt ||
    existing.nextDueDate.getTime() !== toDbDate(input.dueDate).getTime()
  )
    throw changed();
  const nextDueDate = nextBillDate(
    existing.nextDueDate,
    existing.recurrenceAnchor,
    existing.frequency.toLowerCase() as BillFrequency,
  );
  if (nextDueDate.getUTCFullYear() > 9999)
    throw badRequest("VALIDATION_ERROR", "The next due date is outside the supported calendar range.");
  const result = await repository.payBill(existing, toDbDate(input.date), input.amount, nextDueDate);
  if (!result) throw changed();
  return { bill: toBillResponse(result.bill), transactionId: result.transactionId };
}
