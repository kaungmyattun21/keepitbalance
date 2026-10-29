import type { Category, Transaction } from "@keepitbalance/shared/finance";
import { ReceiptText } from "lucide-react";
import { useState } from "react";
import { Pagination } from "@/shared/components/Pagination";
import { SectionCard } from "@/shared/components/SectionCard";
import { Button } from "@/shared/components/ui/button";
import { formatMonth } from "@/shared/lib/format";
import { useTransactionListParams } from "../hooks/use-transaction-list-params.ts";
import { useTransactions } from "../hooks/use-transactions.ts";
import { DeleteTransactionDialog } from "./DeleteTransactionDialog.tsx";
import { EditTransactionDialog } from "./EditTransactionDialog.tsx";
import { MonthSwitcher } from "../../../shared/components/MonthSwitcher.tsx";
import { TransactionListItem } from "./TransactionListItem.tsx";

export function TransactionList({ categories }: { categories: Category[] }) {
  const { month, page, showMonth, showPage } = useTransactionListParams();
  const transactionPage = useTransactions({ month, page });
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const isEmpty = transactionPage.data.length === 0;

  return (
    <SectionCard
      title="Transactions"
      description={`${transactionPage.total} in ${formatMonth(month)}`}
      action={<MonthSwitcher month={month} onMonthChange={showMonth} />}
    >
      {isEmpty ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ReceiptText className="size-5" aria-hidden />
          </span>
          <p className="text-sm text-muted-foreground">
            {page > 1 ? "Nothing on this page." : `No transactions in ${formatMonth(month)} yet.`}
          </p>
          {page > 1 && (
            <Button variant="outline" size="sm" onClick={() => showPage(1)}>
              Back to the first page
            </Button>
          )}
        </div>
      ) : (
        <ul className="-my-3 divide-y">
          {transactionPage.data.map((transaction) => (
            <TransactionListItem
              key={transaction.id}
              transaction={transaction}
              onEdit={setEditingTransaction}
              onDelete={setDeletingTransaction}
            />
          ))}
        </ul>
      )}

      {transactionPage.totalPages > 1 && (
        <div className="mt-6 border-t pt-4">
          <Pagination page={page} totalPages={transactionPage.totalPages} onPageChange={showPage} />
        </div>
      )}

      <EditTransactionDialog
        transaction={editingTransaction}
        categories={categories}
        onClose={() => setEditingTransaction(null)}
      />
      <DeleteTransactionDialog
        transaction={deletingTransaction}
        onClose={() => setDeletingTransaction(null)}
      />
    </SectionCard>
  );
}
