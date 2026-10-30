import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/shared/components/ui/field";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
} from "@/shared/components/ui/select";
import { fieldAria } from "./field-aria.ts";
import { useFieldIdPrefix } from "./field-id-scope.ts";

export type SelectOption = { value: string; label: string; group?: string };

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
            <Select name={field.name} value={field.value} onValueChange={field.onChange} disabled={disabled}>
              <SelectTrigger
                ref={field.ref}
                onBlur={field.onBlur}
                id={fieldId}
                aria-invalid={fieldState.invalid}
                aria-describedby={aria.describedBy}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {[...new Set(options.map((option) => option.group))].map((group) => (
                  <SelectGroup key={group ?? "ungrouped"}>
                    {group && <SelectLabel>{group}</SelectLabel>}
                    {options
                      .filter((option) => option.group === group)
                      .map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            {description && <FieldDescription id={aria.descriptionId}>{description}</FieldDescription>}
            <FieldError id={aria.errorId} errors={[fieldState.error]} />
          </Field>
        );
      }}
    />
  );
}
