import { todayIn } from "@keepitbalance/shared/dates";
import { useCurrentUser } from "@/modules/auth";
import { Page } from "@/shared/components/Page";
import { SectionCard } from "@/shared/components/SectionCard";
import { useCategories } from "../../shared/hooks/use-categories.ts";
import { TransactionForm } from "./components/TransactionForm.tsx";
import { TransactionList } from "./components/TransactionList.tsx";

export function FinancePage() {
  const user = useCurrentUser();
  const categories = useCategories();

  return (
    <Page title="Finance" description="Record your income and expenses, and keep them tidy.">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <SectionCard title="Add transaction" description="Amounts are saved exactly as entered, to the cent.">
          <TransactionForm categories={categories} today={todayIn(user.timezone ?? "UTC")} />
        </SectionCard>
        <TransactionList categories={categories} />
      </div>
    </Page>
  );
}
