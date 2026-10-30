import { Plus, Search } from "lucide-react";
import { useState } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import type { Ingredient } from "@keepitbalance/shared/groceries";
import { SelectField } from "@/shared/components/form/SelectField";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { useIngredients } from "../queries.ts";
import { IngredientForm } from "../../features/ingredients/components/IngredientForm.tsx";

export function IngredientPicker<T extends FieldValues>({
  control,
  name,
  onCreated,
  compact = false,
}: {
  compact?: boolean;
  control: Control<T>;
  name: Path<T>;
  onCreated: (ingredient: Ingredient) => void;
}) {
  const ingredients = useIngredients();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {!compact && (
        <Input
          type="search"
          aria-label="Search ingredients"
          placeholder="Search ingredients…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
        />
      )}
      <div className={compact ? "flex min-w-0 items-start gap-1" : "flex flex-col gap-2"}>
        <div className="min-w-0 flex-1">
          <SelectField
            control={control}
            name={name}
            label="Ingredient"
            placeholder="Choose an ingredient"
            options={ingredients
              .filter((ingredient) => ingredient.name.toLowerCase().includes(search.trim().toLowerCase()))
              .map((ingredient) => ({
                value: ingredient.id,
                label: `${ingredient.name} (${ingredient.unit})`,
              }))}
          />
        </div>
        {compact && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-9 w-7 shrink-0"
            aria-label="Search ingredients"
            aria-expanded={searchOpen}
            onClick={() => {
              if (searchOpen) setSearch("");
              setSearchOpen(!searchOpen);
            }}
          >
            <Search aria-hidden />
          </Button>
        )}
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant={compact ? "ghost" : "link"}
              size={compact ? "icon-sm" : "default"}
              className={compact ? "h-9 w-7 shrink-0" : "self-start p-0"}
              aria-label="New ingredient"
            >
              {compact ? <Plus aria-hidden /> : "New ingredient"}
            </Button>
          </DialogTrigger>
          <DialogContent className="flex max-h-[calc(100svh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
            <DialogHeader className="border-b p-6">
              <DialogTitle>New ingredient</DialogTitle>
              <DialogDescription>
                Create it once and reuse it in your pantry and shopping lists.
              </DialogDescription>
            </DialogHeader>
            {creating && (
              <IngredientForm
                onSaved={(ingredient) => {
                  setSearch("");
                  setSearchOpen(false);
                  onCreated(ingredient);
                  setCreating(false);
                }}
                onCancel={() => setCreating(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
      {compact && searchOpen && (
        <Input
          type="search"
          aria-label="Search ingredients"
          placeholder="Search ingredients…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          autoFocus
        />
      )}
    </div>
  );
}
