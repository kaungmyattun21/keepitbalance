export const groceryKeys = {
  all: ["groceries"] as const,
  ingredients: ["groceries", "ingredients"] as const,
  pantry: ["groceries", "pantry"] as const,
  current: ["groceries", "current"] as const,
  itemUpdates: ["groceries", "shopping-item-updates"] as const,
  history: ["groceries", "history"] as const,
};
