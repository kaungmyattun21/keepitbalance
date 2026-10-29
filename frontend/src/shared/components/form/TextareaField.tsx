import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Textarea } from "@/shared/components/ui/textarea";
import { fieldAria } from "./field-aria.ts";
import { useFieldIdPrefix } from "./field-id-scope.ts";

type TextareaFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  maxLength?: number;
  description?: string;
};

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  maxLength,
  description,
}: TextareaFieldProps<T>) {
  const idPrefix = useFieldIdPrefix();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const fieldId = `${idPrefix}${field.name}`;
        const aria = fieldAria(fieldId, {
          hasDescription: Boolean(description),
          invalid: fieldState.invalid,
        });
        return (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
            <Textarea
              {...field}
              id={fieldId}
              value={field.value ?? ""}
              maxLength={maxLength}
              aria-invalid={fieldState.invalid}
              aria-describedby={aria.describedBy}
            />
            {description && <FieldDescription id={aria.descriptionId}>{description}</FieldDescription>}
            <FieldError id={aria.errorId} errors={[fieldState.error]} />
          </Field>
        );
      }}
    />
  );
}
