import { IngredientsBatchForm } from "./components/IngredientsBatchForm.tsx";
import { useState } from "react";
import type { Ingredient } from "@keepitbalance/shared/groceries";
import { DocumentTitle } from "@/shared/components/DocumentTitle";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { SectionCard } from "@/shared/components/SectionCard";
import { useIngredients } from "../../shared/queries.ts";
import { useIngredientMutation } from "../../shared/use-grocery-mutations.ts";
import { GroceryDrawer } from "../../shared/components/GroceryDrawer.tsx";
import { ConfirmRemoval } from "../../shared/components/ConfirmRemoval.tsx";
import { IngredientForm } from "./components/IngredientForm.tsx";

export function IngredientsPage() {
  const ingredients = useIngredients();
  const mutation = useIngredientMutation();
  const [search, setSearch] = useState("");
  const filtered = ingredients.filter((ingredient) =>
    ingredient.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const [editor, setEditor] = useState<Ingredient | "new" | null>(null);
  const [removing, setRemoving] = useState<Ingredient | null>(null);
  return (
    <div className="flex w-full flex-col gap-5">
      <DocumentTitle title="Ingredients" />
      <SectionCard
        title="Ingredients"
        description="A shared ingredient catalog for your pantry and shopping lists."
        action={<Button onClick={() => setEditor("new")}>Add ingredient</Button>}
      >
        <Input
          type="search"
          aria-label="Search ingredients"
          placeholder="Search ingredients…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="mb-4"
        />
        {ingredients.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No ingredients yet. Add one here or create one while adding pantry or shopping items.
          </p>
        ) : (
          <ul className="divide-y">
            {filtered.map((ingredient) => (
              <li key={ingredient.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <span className="font-medium">{ingredient.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {ingredient.unit}
                    {ingredient.inUse ? " · In use" : ""}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={`Edit ${ingredient.name}`}
                    onClick={() => setEditor(ingredient)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove ${ingredient.name}`}
                    disabled={ingredient.inUse}
                    onClick={() => setRemoving(ingredient)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {ingredients.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">No ingredients match your search.</p>
        )}
      </SectionCard>
      <GroceryDrawer
        open={editor !== null}
        title={editor === "new" ? "Add ingredient" : "Edit ingredient"}
        description="Keep one name and unit for each ingredient."
        onClose={() => setEditor(null)}
      >
        {editor === "new" ? (
          <IngredientsBatchForm onClose={() => setEditor(null)} />
        ) : (
          editor && (
            <IngredientForm
              key={editor.id}
              ingredient={editor}
              onSaved={() => setEditor(null)}
              onCancel={() => setEditor(null)}
            />
          )
        )}
      </GroceryDrawer>
      <ConfirmRemoval
        open={removing !== null}
        title="Remove this ingredient?"
        description={`${removing?.name ?? "This ingredient"} will be removed. Ingredients used by pantry, recipes or shopping lists must be kept.`}
        onClose={() => setRemoving(null)}
        onConfirm={() => (removing ? mutation.mutateAsync({ id: removing.id }) : Promise.resolve())}
      />
    </div>
  );
}
