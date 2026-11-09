import { Controller, type Control } from "react-hook-form";
import { Ban } from "lucide-react";
import { categoryIcons, type CreateCategoryValues } from "@keepitbalance/shared/finance";
import { CategoryIcon } from "../../../shared/components/CategoryIcon";
import { categoryIconOptions } from "../../../shared/category-icons";
import { cn } from "@/shared/lib/utils";

export function CategoryIconPicker({
  control,
  disabled,
}: {
  control: Control<CreateCategoryValues>;
  disabled: boolean;
}) {
  return (
    <Controller
      control={control}
      name="icon"
      render={({ field, fieldState }) => (
        <fieldset disabled={disabled}>
          <legend className="mb-2 text-sm font-medium">
            Icon <span className="font-normal text-muted-foreground">(optional)</span>
          </legend>
          <div className="flex max-h-64 flex-wrap gap-1.5 overflow-y-auto overscroll-contain p-1">
            {[null, ...categoryIcons].map((icon) => (
              <button
                key={icon ?? "none"}
                type="button"
                aria-label={icon ? `${categoryIconOptions[icon].label} icon` : "No icon"}
                aria-pressed={(field.value ?? null) === icon}
                title={icon ? categoryIconOptions[icon].label : "No icon"}
                onClick={() => field.onChange(icon)}
                onBlur={field.onBlur}
                ref={icon === null ? field.ref : undefined}
                className={cn(
                  "grid size-11 place-items-center rounded-xl border outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                  (field.value ?? null) === icon
                    ? "border-brand/50 ring-2 ring-brand/20"
                    : "border-transparent hover:border-border",
                )}
              >
                {icon ? (
                  <CategoryIcon icon={icon} />
                ) : (
                  <Ban className="size-4 text-muted-foreground" aria-hidden />
                )}
              </button>
            ))}
          </div>
          {fieldState.error && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {fieldState.error.message}
            </p>
          )}
        </fieldset>
      )}
    />
  );
}
