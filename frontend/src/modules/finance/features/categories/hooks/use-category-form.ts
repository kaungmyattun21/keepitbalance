import { zodResolver } from "@hookform/resolvers/zod";
import { createCategorySchema, type CreateCategoryValues } from "@keepitbalance/shared/finance";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { ApiError } from "@/shared/lib/api";
import type { CategoryEditorOptions } from "../types.ts";
import { useCategoryMutation } from "./use-category-mutation.ts";

export function useCategoryForm({
  group,
  category,
  onClose,
}: Pick<CategoryEditorOptions, "group" | "category" | "onClose">) {
  const mutation = useCategoryMutation();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<CreateCategoryValues>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: { name: category?.name ?? "", groupId: category?.groupId ?? group.id },
  });
  async function save(values: CreateCategoryValues) {
    setError(null);
    try {
      await mutation.mutateAsync({ resource: "categories", id: category?.id, values });
      onClose();
    } catch (error) {
      setError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  return { form, error, isPending: mutation.isPending, handleSubmit: form.handleSubmit(save) };
}
