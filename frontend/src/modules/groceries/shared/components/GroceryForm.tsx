import type { ReactNode, FormEventHandler } from "react";
import { FieldIdScope } from "@/shared/components/form/FieldIdScope";
import { FormAlert } from "@/shared/components/form/FormAlert";
import { Button } from "@/shared/components/ui/button";
import { FieldGroup } from "@/shared/components/ui/field";

export function GroceryForm({
  children,
  error,
  pending,
  onSubmit,
  onCancel,
  submitLabel = "Save",
}: {
  children: ReactNode;
  error: string | null;
  pending: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCancel: () => void;
  submitLabel?: string;
}) {
  return (
    <FieldIdScope>
      <form
        noValidate
        onSubmit={(event) => {
          event.stopPropagation();
          onSubmit(event);
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex-1 overflow-y-auto overscroll-contain p-6">
          <FormAlert message={error} />
          <FieldGroup>{children}</FieldGroup>
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : submitLabel}
          </Button>
        </div>
      </form>
    </FieldIdScope>
  );
}
