import type { Category, CategoryGroup } from "@keepitbalance/shared/finance";
import { useState } from "react";
import { SectionCard } from "@/shared/components/SectionCard";
import { Button } from "@/shared/components/ui/button";
import { FormAlert } from "@/shared/components/form/FormAlert";
import { ApiError } from "@/shared/lib/api";
import { useCategoryMutation } from "../hooks/use-category-mutation.ts";
import { CategoryEditor } from "./CategoryEditor.tsx";
import { GroupEditor } from "./GroupEditor.tsx";

export function CategoryGroupCard({ group, groups }: { group: CategoryGroup; groups: CategoryGroup[] }) {
  const [editor, setEditor] = useState<"group" | "new-category" | Category | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useCategoryMutation();
  async function remove(resource: "categories" | "category-groups", id: string) {
    setError(null);
    try {
      await mutation.mutateAsync({ resource, id });
    } catch (error) {
      setError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }
  return (
    <SectionCard
      title={group.name}
      description={group.type === "expense" ? "Expense categories" : "Income categories"}
    >
      <FormAlert message={error} />
      {editor === "group" ? (
        <GroupEditor group={group} onClose={() => setEditor(null)} />
      ) : (
        <div className="mb-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditor("group")}>
            Rename group
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={mutation.isPending || group.categories.length > 0}
            onClick={() => void remove("category-groups", group.id)}
          >
            Delete group
          </Button>
          <Button size="sm" onClick={() => setEditor("new-category")}>
            Add category
          </Button>
        </div>
      )}
      {group.categories.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No categories yet. Add one to start tracking spending or income.
        </p>
      )}
      <ul className="divide-y">
        {group.categories.map((category) => (
          <li key={category.id} className="py-3">
            {typeof editor === "object" && editor?.id === category.id ? (
              <CategoryEditor
                group={group}
                groups={groups}
                category={category}
                onClose={() => setEditor(null)}
              />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{category.name}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Edit ${category.name}`}
                    onClick={() => setEditor(category)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Delete ${category.name}`}
                    disabled={mutation.isPending}
                    onClick={() => void remove("categories", category.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {editor === "new-category" && (
        <CategoryEditor group={group} groups={groups} onClose={() => setEditor(null)} />
      )}
      {group.categories.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Move or delete all categories to delete this group. Categories used by transactions, budgets or
          bills must be kept.
        </p>
      )}
    </SectionCard>
  );
}
