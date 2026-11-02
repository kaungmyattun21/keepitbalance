import { Outlet } from "react-router";
import { BookOpen, CalendarDays, History, Leaf, Package, ShoppingBasket } from "lucide-react";
import { PageHeader } from "@/shared/components/Page";
import { SectionNavigation } from "@/shared/components/SectionNavigation";

const grocerySections = [
  { to: "/meals", label: "Shopping list", icon: ShoppingBasket, end: true },
  { to: "/meals/plan", label: "Meal plan", icon: CalendarDays },
  { to: "/meals/recipes", label: "Recipes", icon: BookOpen },
  { to: "/meals/pantry", label: "Pantry", icon: Package },
  { to: "/meals/ingredients", label: "Ingredients", icon: Leaf },
  { to: "/meals/history", label: "History", icon: History },
];

export function GroceryLayout() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-4 sm:gap-8">
      <PageHeader title="Groceries" description="Your shopping, pantry and everyday essentials." />
      <SectionNavigation label="Grocery sections" items={grocerySections} />
      <Outlet />
    </div>
  );
}
