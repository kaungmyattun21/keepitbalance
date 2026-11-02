export const groceryKeys = {
  all: ["groceries"] as const,
  recipes: ["groceries", "recipes"] as const,
  mealPlan: (week: string) => ["groceries", "meal-plan", week] as const,
  generation: (week: string) => ["groceries", "generation", week] as const,
  ingredients: ["groceries", "ingredients"] as const,
  pantry: ["groceries", "pantry"] as const,
  current: ["groceries", "current"] as const,
  itemUpdates: ["groceries", "shopping-item-updates"] as const,
  history: ["groceries", "history"] as const,
};
