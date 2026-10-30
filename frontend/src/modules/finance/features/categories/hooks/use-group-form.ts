import { zodResolver } from "@hookform/resolvers/zod";
import { createCategoryGroupSchema, type CreateCategoryGroupValues } from "@keepitbalance/shared/finance";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { ApiError } from "@/shared/lib/api";
import type { GroupEditorOptions } from "../types.ts";
import { useCategoryMutation } from "./use-category-mutation.ts";

export function useGroupForm({ group, onClose }: GroupEditorOptions) {
  const mutation = useCategoryMutation();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<CreateCategoryGroupValues>({
    resolver: zodResolver(createCategoryGroupSchema),
    defaultValues: { name: group?.name ?? "", type: group?.type ?? "expense" },
  });
  async function save(values: CreateCategoryGroupValues) {
    setError(null);
    try {
      await mutation.mutateAsync({
        resource: "category-groups",
        id: group?.id,
        values: group ? { name: values.name } : values,
      });
      onClose();
    } catch (error) {
      setError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  return { form, error, isPending: mutation.isPending, handleSubmit: form.handleSubmit(save) };
}
