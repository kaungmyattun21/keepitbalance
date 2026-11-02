import type { RouteObject } from "react-router";
import { GroceryLayout } from "./shared/components/GroceryLayout.tsx";

export async function lazyShoppingListPage() {
  const [{ ShoppingListPage }, { shoppingListPageLoader }] = await Promise.all([
    import("./features/shopping-lists/ShoppingListPage.tsx"),
    import("./features/shopping-lists/shopping-list-page-loader.ts"),
  ]);
  return { Component: ShoppingListPage, loader: shoppingListPageLoader };
}
async function lazyPantryPage() {
  const [{ PantryPage }, { pantryPageLoader }] = await Promise.all([
    import("./features/pantry/PantryPage.tsx"),
    import("./features/pantry/pantry-page-loader.ts"),
  ]);
  return { Component: PantryPage, loader: pantryPageLoader };
}
async function lazyIngredientsPage() {
  const [{ IngredientsPage }, { ingredientsPageLoader }] = await Promise.all([
    import("./features/ingredients/IngredientsPage.tsx"),
    import("./features/ingredients/ingredients-page-loader.ts"),
  ]);
  return { Component: IngredientsPage, loader: ingredientsPageLoader };
}
async function lazyHistoryPage() {
  const [{ ShoppingHistoryPage }, { shoppingHistoryPageLoader }] = await Promise.all([
    import("./features/shopping-lists/ShoppingHistoryPage.tsx"),
    import("./features/shopping-lists/shopping-history-page-loader.ts"),
  ]);
  return { Component: ShoppingHistoryPage, loader: shoppingHistoryPageLoader };
}
async function lazyRecipesPage() {
  const [{ RecipesPage }, { recipesPageLoader }] = await Promise.all([
    import("./features/recipes/RecipesPage.tsx"),
    import("./features/recipes/recipes-page-loader.ts"),
  ]);
  return { Component: RecipesPage, loader: recipesPageLoader };
}
async function lazyMealPlanPage() {
  const [{ MealPlanPage }, { mealPlanPageLoader }] = await Promise.all([
    import("./features/meal-plans/MealPlanPage.tsx"),
    import("./features/meal-plans/meal-plan-page-loader.ts"),
  ]);
  return { Component: MealPlanPage, loader: mealPlanPageLoader };
}
export const groceriesRoute: RouteObject = {
  path: "meals",
  Component: GroceryLayout,
  children: [
    { index: true, lazy: lazyShoppingListPage },
    { path: "plan", lazy: lazyMealPlanPage },
    { path: "recipes", lazy: lazyRecipesPage },
    { path: "pantry", lazy: lazyPantryPage },
    { path: "ingredients", lazy: lazyIngredientsPage },
    { path: "history", lazy: lazyHistoryPage },
  ],
};
