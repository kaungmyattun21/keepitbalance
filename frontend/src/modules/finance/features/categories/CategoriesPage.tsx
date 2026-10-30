import { Link, useLocation } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { DocumentTitle } from "@/shared/components/DocumentTitle";
import { Button } from "@/shared/components/ui/button";
import { useCategoryGroups } from "../../shared/hooks/use-category-groups.ts";
import { GroupEditor } from "./components/GroupEditor.tsx";
import { CategoryGroupCard } from "./components/CategoryGroupCard.tsx";

export function CategoriesPage() {
  const location = useLocation();
  const requestedReturnTo: unknown = location.state?.returnTo;
  const returnTo =
    typeof requestedReturnTo === "string" &&
    /^\/finance\/(budgets|transactions|bills)(\?|$)/.test(requestedReturnTo)
      ? requestedReturnTo
      : "/finance/budgets";
  const returnLabel = returnTo.startsWith("/finance/transactions")
    ? "Back to transactions"
    : returnTo.startsWith("/finance/bills")
      ? "Back to bills"
      : "Back to budgets";
  const groups = useCategoryGroups();
  const [adding, setAdding] = useState(false);
  return (
    <div className="flex w-full flex-col gap-5">
      <DocumentTitle title="Categories" />
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link to={returnTo}>
          <ArrowLeft aria-hidden />
          {returnLabel}
        </Link>
      </Button>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Manage categories</h2>
        <Button onClick={() => setAdding(true)}>Add group</Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Organize your income and expenses into groups. Every category belongs to a group.
      </p>
      {adding && <GroupEditor onClose={() => setAdding(false)} />}
      {groups.length === 0 && <p>Create a group, then add categories for your transactions and budgets.</p>}
      {groups.map((group) => (
        <CategoryGroupCard key={group.id} group={group} groups={groups} />
      ))}
    </div>
  );
}
