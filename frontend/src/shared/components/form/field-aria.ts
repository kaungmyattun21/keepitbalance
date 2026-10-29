export function fieldAria(
  fieldId: string,
  { hasDescription, invalid }: { hasDescription: boolean; invalid: boolean },
) {
  const descriptionId = `${fieldId}-description`;
  const errorId = `${fieldId}-error`;
  const describedBy = [hasDescription && descriptionId, invalid && errorId].filter(Boolean).join(" ");
  return { descriptionId, errorId, describedBy: describedBy || undefined };
}
