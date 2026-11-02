import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import {
  RECIPE_IMAGE_MAX_BYTES,
  recipeImageTypes,
  type RecipeImage,
} from "@keepitbalance/shared/meal-planning";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { env } from "@/shared/lib/env";

export function RecipeImageField({
  value,
  existingUrl,
  disabled,
  onChange,
  onReadingChange,
}: {
  value: RecipeImage | null | undefined;
  existingUrl?: string | null;
  disabled: boolean;
  onChange: (image: RecipeImage | null) => void;
  onReadingChange: (reading: boolean) => void;
}) {
  const id = useId();
  const reader = useRef<FileReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => () => reader.current?.abort(), []);
  const preview = value
    ? `data:${value.contentType};base64,${value.data}`
    : value === undefined && existingUrl
      ? `${env.apiBaseUrl}${existingUrl}`
      : null;
  function select(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!recipeImageTypes.includes(file.type as RecipeImage["contentType"])) {
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > RECIPE_IMAGE_MAX_BYTES || file.size === 0) {
      setError("Choose an image up to 2 MB.");
      return;
    }
    const next = new FileReader();
    reader.current = next;
    onReadingChange(true);
    next.onload = () => {
      onChange({
        contentType: file.type as RecipeImage["contentType"],
        data: String(next.result).split(",")[1]!,
      });
      onReadingChange(false);
    };
    next.onerror = () => {
      setError("Couldn't read this image. Try another photo.");
      onReadingChange(false);
    };
    next.readAsDataURL(file);
  }
  return (
    <div className="space-y-3">
      <label htmlFor={id} className="text-sm font-medium">
        Recipe photo <span className="font-normal text-muted-foreground">(optional)</span>
      </label>
      {preview ? (
        <div className="relative overflow-hidden rounded-xl bg-muted/30">
          <img
            src={preview}
            crossOrigin="use-credentials"
            alt="Recipe photo preview"
            className="aspect-video w-full object-cover"
          />
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            disabled={disabled}
            aria-label="Remove recipe photo"
            className="absolute top-2 right-2"
            onClick={() => {
              onChange(null);
              setError(null);
            }}
          >
            <X aria-hidden />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          <ImagePlus className="size-5" aria-hidden />
          Add a photo of your dish.
        </div>
      )}
      <Input
        id={id}
        type="file"
        accept={recipeImageTypes.join(",")}
        disabled={disabled}
        aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
        aria-invalid={Boolean(error)}
        onChange={(event) => {
          select(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <p id={`${id}-help`} className="text-xs text-muted-foreground">
        JPEG, PNG or WebP · up to 2 MB.
      </p>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
