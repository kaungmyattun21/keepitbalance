import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Page } from "@keepitbalance/shared/api";
import {
  RECEIPT_MAX_BYTES,
  receiptImageTypes,
  type Receipt,
  type ReceiptDetail,
  type UploadReceipt,
  type ConfirmReceiptValues,
} from "@keepitbalance/shared/receipts";
import { api } from "@/shared/lib/api";
import { financeKeys } from "../../shared/query-keys.ts";
import { invalidateMoneyQueries } from "../../shared/invalidate-money-queries.ts";

const receiptKeys = {
  all: [...financeKeys.all, "receipts"] as const,
  list: (page: number) => [...receiptKeys.all, "list", page] as const,
  detail: (id: string) => [...receiptKeys.all, "detail", id] as const,
};
export const receiptPending = (receipt: Receipt) => ["queued", "processing"].includes(receipt.status);

export function receiptsQuery(page: number) {
  return queryOptions({
    queryKey: receiptKeys.list(page),
    queryFn: ({ signal }) => api.get<Page<Receipt>>("/receipts", { query: { page, pageSize: 5 }, signal }),
    refetchInterval: (query) => (query.state.data?.data.some(receiptPending) ? 3000 : false),
  });
}
export function receiptQuery(id: string) {
  return queryOptions({
    queryKey: receiptKeys.detail(id),
    queryFn: async ({ signal }) =>
      (await api.get<{ data: ReceiptDetail }>(`/receipts/${id}`, { signal })).data,
    refetchInterval: (query) => (query.state.data && receiptPending(query.state.data) ? 2000 : false),
  });
}

async function encodeReceipt(file: File): Promise<UploadReceipt> {
  if (!receiptImageTypes.includes(file.type as UploadReceipt["contentType"]))
    throw new Error("Choose a JPEG, PNG, or WebP receipt.");
  if (file.size === 0 || file.size > RECEIPT_MAX_BYTES) throw new Error("Choose an image up to 5 MB.");
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]!);
    reader.onerror = () => reject(new Error("Couldn't read this image. Try another photo."));
    reader.readAsDataURL(file);
  });
  return { contentType: file.type as UploadReceipt["contentType"], data };
}

export function useUploadReceipt() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) =>
      api.post<{ data: Receipt; duplicate: boolean }>("/receipts", await encodeReceipt(file)),
    onSuccess: () => client.invalidateQueries({ queryKey: receiptKeys.all }),
  });
}

export function useReceiptAction(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: ConfirmReceiptValues | "retry") =>
      values === "retry"
        ? api.post<{ data: Receipt }>(`/receipts/${id}/retry`)
        : api.post<{ data: Receipt }>(`/receipts/${id}/confirm`, values),
    onSuccess: async ({ data }) => {
      client.setQueryData<ReceiptDetail>(receiptKeys.detail(id), (previous) => ({
        ...data,
        rawText: previous?.rawText ?? null,
      }));
      await Promise.all([
        client.invalidateQueries({ queryKey: receiptKeys.all }),
        ...(data.status === "confirmed" ? [invalidateMoneyQueries(client)] : []),
      ]);
    },
  });
}
