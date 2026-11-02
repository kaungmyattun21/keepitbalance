import { moneySchema } from "@keepitbalance/shared/schemas";

// Keep a decimal draft as text; normalization happens at submission.
export function amountAfterKey(current: string, key: string): string {
  if (key === "Backspace") return current.slice(0, -1);
  if (key === "Delete") return "";
  if (!/^[0-9.]$/.test(key)) return current;
  if (key === "." && current.includes(".")) return current;
  const next = (current + key).replace(/^0+(?=\d)/, "");
  const draft = next.startsWith(".") ? `0${next}` : next;
  return moneySchema.safeParse(draft.endsWith(".") ? `${draft}0` : draft).success ? draft : current;
}
