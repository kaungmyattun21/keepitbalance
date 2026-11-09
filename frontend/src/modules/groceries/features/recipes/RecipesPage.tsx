import { useState } from "react";
import { BookOpen, Plus, Search } from "lucide-react";
import type { Recipe } from "@keepitbalance/shared/meal-planning";
import { env } from "@/shared/lib/env";
import { DocumentTitle } from "@/shared/components/DocumentTitle";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { SectionCard } from "@/shared/components/SectionCard";
import { GroceryDrawer } from "../../shared/components/GroceryDrawer.tsx";
import { ConfirmRemoval } from "../../shared/components/ConfirmRemoval.tsx";
import { useRecipes } from "../../shared/planning-queries.ts";
import { useRecipeMutation } from "../../shared/use-planning-mutations.ts";
import { RecipeCard } from "./components/RecipeCard.tsx";
import { RecipeForm } from "./components/RecipeForm.tsx";
export function RecipesPage() {
  const recipes = useRecipes();
  const mutation = useRecipeMutation();
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<Recipe | "new" | null>(null);
  const [viewing, setViewing] = useState<Recipe | null>(null);
  const [removing, setRemoving] = useState<Recipe | null>(null);
  const filtered = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <DocumentTitle title="Recipes" />
      <SectionCard
        title="Your recipes"
        description="Save what you cook, then plan your week."
        action={
          <Button onClick={() => setEditor("new")}>
            <Plus aria-hidden />
            Add recipe
          </Button>
        }
      >
        <div className="relative mb-5 max-w-sm">
          <Search
            className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            aria-label="Search recipes"
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search recipes…"
          />
        </div>
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <BookOpen className="mx-auto mb-3 size-8" aria-hidden />
            {recipes.length ? "No recipes match your search." : "No recipes yet. Add your first recipe."}
          </div>
        ) : (
          <ul className="grid items-stretch gap-5 @xl/section:grid-cols-2 @4xl/section:grid-cols-3">
            {filtered.map((recipe) => (
              <li key={recipe.id} className="min-w-0">
                <RecipeCard recipe={recipe} onView={setViewing} onEdit={setEditor} onDelete={setRemoving} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      <GroceryDrawer
        open={editor !== null}
        title={editor === "new" ? "Add recipe" : "Edit recipe"}
        description="Ingredient quantities are for the recipe's base servings."
        onClose={() => setEditor(null)}
      >
        {editor && (
          <RecipeForm
            key={editor === "new" ? "new" : editor.id}
            recipe={editor === "new" ? undefined : editor}
            onClose={() => setEditor(null)}
          />
        )}
      </GroceryDrawer>
      <GroceryDrawer
        open={viewing !== null}
        title={viewing?.name ?? "Recipe"}
        description={
          viewing
            ? `${viewing.servings} servings · ${viewing.caloriesPerServing} kcal per serving`
            : "Recipe details"
        }
        onClose={() => setViewing(null)}
      >
        {viewing && (
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
            {viewing.imageUrl && (
              <img
                src={`${env.apiBaseUrl}${viewing.imageUrl}`}
                crossOrigin="use-credentials"
                alt={viewing.name}
                className="aspect-video w-full rounded-xl object-cover"
              />
            )}
            <section>
              <h3 className="mb-3 font-medium">Ingredients</h3>
              <ul className="space-y-2">
                {viewing.ingredients.map((item) => (
                  <li key={item.ingredient.id} className="flex flex-wrap justify-between gap-2 text-sm">
                    <span>{item.ingredient.name}</span>
                    <span className="text-muted-foreground">
                      {item.quantity} {item.ingredient.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="mb-3 font-medium">Instructions</h3>
              <p className="text-sm leading-relaxed wrap-anywhere whitespace-pre-line text-muted-foreground">
                {viewing.steps || "No instructions added."}
              </p>
            </section>
            <Button
              variant="outline"
              onClick={() => {
                setEditor(viewing);
                setViewing(null);
              }}
            >
              Edit recipe
            </Button>
          </div>
        )}
      </GroceryDrawer>
      <ConfirmRemoval
        open={removing !== null}
        title="Delete this recipe?"
        description="The recipe will be removed. Ingredients stay in your catalog. Recipes used in meal plans must be kept."
        onClose={() => setRemoving(null)}
        onConfirm={() =>
          removing ? mutation.mutateAsync({ action: "delete", id: removing.id }) : Promise.resolve()
        }
      />
    </div>
  );
}
