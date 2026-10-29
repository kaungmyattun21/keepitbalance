import type { Category, CreateTransactionInput, Transaction } from "@keepitbalance/shared/finance";

export type TransactionFormField = keyof CreateTransactionInput;

export type TransactionFormOptions = {
  categories: Category[];
  today: string;
  transaction?: Transaction;
  onSaved?: () => void;
};

export type TransactionListParams = {
  month: string;
  page: number;
};
