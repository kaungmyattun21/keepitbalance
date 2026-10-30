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
export const groceriesRoute: RouteObject = {
  path: "meals",
  Component: GroceryLayout,
  children: [
    { index: true, lazy: lazyShoppingListPage },
    { path: "pantry", lazy: lazyPantryPage },
    { path: "ingredients", lazy: lazyIngredientsPage },
    { path: "history", lazy: lazyHistoryPage },
  ],
};
