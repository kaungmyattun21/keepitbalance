import type { CategoryEditorOptions } from "../types.ts";
import { useCategoryForm } from "../hooks/use-category-form.ts";
import { FieldIdScope } from "@/shared/components/form/FieldIdScope";
import { FormAlert } from "@/shared/components/form/FormAlert";
import { TextField } from "@/shared/components/form/TextField";
import { SelectField } from "@/shared/components/form/SelectField";
import { Button } from "@/shared/components/ui/button";

export function CategoryEditor({ group, groups, category, onClose }: CategoryEditorOptions) {
  const { form, error, isPending, handleSubmit } = useCategoryForm({ group, category, onClose });
  return (
    <FieldIdScope>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border p-4">
        <FormAlert message={error} />
        <TextField control={form.control} name="name" label="Category name" />
        <SelectField
          control={form.control}
          name="groupId"
          label="Group"
          placeholder="Choose a group"
          options={groups
            .filter((entry) => entry.type === group.type)
            .map((entry) => ({ value: entry.id, label: entry.name }))}
        />
        <div className="flex gap-2">
          <Button disabled={isPending} type="submit">
            {isPending ? "Saving…" : "Save category"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </FieldIdScope>
  );
}
