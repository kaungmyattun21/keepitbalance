import { IngredientsBatchForm } from "./components/IngredientsBatchForm.tsx";
import { Leaf, Pencil, Plus, Search, X } from "lucide-react";
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
        description="Your everyday essentials, all in one place."
        action={
          <Button className="rounded-full px-4" onClick={() => setEditor("new")}>
            <Plus className="size-4" aria-hidden />
            Add ingredient
          </Button>
        }
      >
        <div className="relative my-4 max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            aria-label="Search ingredients"
            placeholder="Search ingredients…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="rounded-full border-border/60 bg-muted/30 pl-9 shadow-none"
          />
        </div>
        {ingredients.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center">
            <Leaf className="mb-1 size-8 text-muted-foreground" strokeWidth={1.5} aria-hidden />
            <p className="max-w-sm text-sm text-muted-foreground">
              No ingredients yet. Add one here or create one while adding pantry or shopping items.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((ingredient) => (
              <li key={ingredient.id} className="flex items-center justify-between gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium wrap-break-word">{ingredient.name}</span>
                  <span className="ml-3 inline-flex items-center rounded-md bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                    {ingredient.unit}
                    {ingredient.inUse ? " · In use" : ""}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="rounded-full text-muted-foreground hover:text-foreground"
                    title="Edit ingredient"
                    aria-label={`Edit ${ingredient.name}`}
                    onClick={() => setEditor(ingredient)}
                  >
                    <Pencil className="size-3.5" aria-hidden />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Remove ingredient"
                    aria-label={`Remove ${ingredient.name}`}
                    disabled={ingredient.inUse}
                    onClick={() => setRemoving(ingredient)}
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {ingredients.length > 0 && filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No ingredients match your search.</p>
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
