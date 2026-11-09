export const groceryKeys = {
  all: ["groceries"] as const,
  mealPlanPreferences: ["groceries", "meal-plan-preferences"] as const,
  recipes: ["groceries", "recipes"] as const,
  mealPlan: (start: string, end: string) => ["groceries", "meal-plan", start, end] as const,
  generation: (start: string, end: string) => ["groceries", "generation", start, end] as const,
  ingredients: ["groceries", "ingredients"] as const,
  pantry: ["groceries", "pantry"] as const,
  current: ["groceries", "current"] as const,
  itemUpdates: ["groceries", "shopping-item-updates"] as const,
  history: ["groceries", "history"] as const,
};
