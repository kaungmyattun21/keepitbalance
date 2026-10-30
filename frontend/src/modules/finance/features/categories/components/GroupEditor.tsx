import type { GroupEditorOptions } from "../types.ts";
import { useGroupForm } from "../hooks/use-group-form.ts";
import { FieldIdScope } from "@/shared/components/form/FieldIdScope";
import { FormAlert } from "@/shared/components/form/FormAlert";
import { TextField } from "@/shared/components/form/TextField";
import { SelectField } from "@/shared/components/form/SelectField";
import { Button } from "@/shared/components/ui/button";

export function GroupEditor({ group, onClose }: GroupEditorOptions) {
  const { form, error, isPending, handleSubmit } = useGroupForm({ group, onClose });
  return (
    <FieldIdScope>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border p-4">
        <FormAlert message={error} />
        <TextField control={form.control} name="name" label="Group name" />
        {!group && (
          <SelectField
            control={form.control}
            name="type"
            label="Type"
            placeholder="Choose a type"
            options={[
              { value: "expense", label: "Expense" },
              { value: "income", label: "Income" },
            ]}
          />
        )}
        <div className="flex gap-2">
          <Button disabled={isPending} type="submit">
            {isPending ? "Saving…" : "Save group"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </FieldIdScope>
  );
}
