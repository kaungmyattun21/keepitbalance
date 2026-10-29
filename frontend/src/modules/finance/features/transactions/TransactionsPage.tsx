import { todayIn } from "@keepitbalance/shared/dates";
import { useCurrentUser } from "@/modules/auth";
import { DocumentTitle } from "@/shared/components/DocumentTitle";
import { SectionCard } from "@/shared/components/SectionCard";
import { useCategories } from "../../shared/hooks/use-categories.ts";
import { TransactionForm } from "./components/TransactionForm.tsx";
import { TransactionList } from "./components/TransactionList.tsx";

export function TransactionsPage() {
  const user = useCurrentUser();
  const categories = useCategories();

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <DocumentTitle title="Transactions" />
      <SectionCard title="Add transaction" description="Amounts are saved exactly as entered, to the cent.">
        <TransactionForm categories={categories} today={todayIn(user.timezone ?? "UTC")} />
      </SectionCard>
      <TransactionList categories={categories} />
    </div>
  );
}
