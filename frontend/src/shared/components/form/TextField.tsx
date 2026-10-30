import type { HTMLAttributes } from "react";
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Input } from "@/shared/components/ui/input";
import { fieldAria } from "./field-aria.ts";
import { useFieldIdPrefix } from "./field-id-scope.ts";

type TextFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  type?: "text" | "email" | "password" | "date";
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  placeholder?: string;
  description?: string;
};

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  type = "text",
  inputMode,
  autoComplete,
  placeholder,
  description,
}: TextFieldProps<T>) {
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
            {type === "date" ? (
              <DatePicker
                {...field}
                id={fieldId}
                label={label}
                aria-invalid={fieldState.invalid}
                aria-describedby={aria.describedBy}
              />
            ) : (
              <Input
                {...field}
                id={fieldId}
                type={type}
                inputMode={inputMode}
                autoComplete={autoComplete}
                placeholder={placeholder}
                aria-invalid={fieldState.invalid}
                aria-describedby={aria.describedBy}
              />
            )}
            {description && <FieldDescription id={aria.descriptionId}>{description}</FieldDescription>}
            <FieldError id={aria.errorId} errors={[fieldState.error]} />
          </Field>
        );
      }}
    />
  );
}
