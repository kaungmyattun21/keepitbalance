import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/shared/components/ui/native-select";
import { fieldAria } from "./field-aria.ts";
import { useFieldIdPrefix } from "./field-id-scope.ts";

export type SelectOption = { value: string; label: string };

type SelectFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: SelectOption[];
  placeholder: string;
  description?: string;
  disabled?: boolean;
};

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder,
  description,
  disabled,
}: SelectFieldProps<T>) {
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
            <NativeSelect
              {...field}
              id={fieldId}
              className="w-full"
              disabled={disabled}
              aria-invalid={fieldState.invalid}
              aria-describedby={aria.describedBy}
            >
              <NativeSelectOption value="" disabled>
                {placeholder}
              </NativeSelectOption>
              {options.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {description && <FieldDescription id={aria.descriptionId}>{description}</FieldDescription>}
            <FieldError id={aria.errorId} errors={[fieldState.error]} />
          </Field>
        );
      }}
    />
  );
}
