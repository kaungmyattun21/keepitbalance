import type { Category, CategoryGroup } from "@keepitbalance/shared/finance";

export type GroupEditorOptions = { group?: CategoryGroup; onClose: () => void };
export type CategoryEditorOptions = {
  group: CategoryGroup;
  groups: CategoryGroup[];
  category?: Category;
  onClose: () => void;
};
