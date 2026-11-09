import type { CategoryIconName } from "@keepitbalance/shared/finance";
import { categoryIconOptions, type categoryIconTones } from "./category-icons";

const chartTones = {
  green: "bg-emerald-500 stroke-emerald-500 dark:bg-emerald-400 dark:stroke-emerald-400",
  blue: "bg-blue-500 stroke-blue-500 dark:bg-blue-400 dark:stroke-blue-400",
  sky: "bg-sky-500 stroke-sky-500 dark:bg-sky-400 dark:stroke-sky-400",
  orange: "bg-orange-500 stroke-orange-500 dark:bg-orange-400 dark:stroke-orange-400",
  amber: "bg-amber-500 stroke-amber-500 dark:bg-amber-400 dark:stroke-amber-400",
  rose: "bg-rose-500 stroke-rose-500 dark:bg-rose-400 dark:stroke-rose-400",
  indigo: "bg-indigo-500 stroke-indigo-500 dark:bg-indigo-400 dark:stroke-indigo-400",
  teal: "bg-teal-500 stroke-teal-500 dark:bg-teal-400 dark:stroke-teal-400",
  violet: "bg-violet-500 stroke-violet-500 dark:bg-violet-400 dark:stroke-violet-400",
  pink: "bg-pink-500 stroke-pink-500 dark:bg-pink-400 dark:stroke-pink-400",
  lime: "bg-lime-500 stroke-lime-500 dark:bg-lime-400 dark:stroke-lime-400",
  slate: "bg-slate-500 stroke-slate-500 dark:bg-slate-400 dark:stroke-slate-400",
} satisfies Record<keyof typeof categoryIconTones, string>;

const fallbackTones = Object.keys(chartTones) as (keyof typeof chartTones)[];

// Categories without icons still keep the same chart color when their order or spending changes.
export function categoryChartColor(icon: string | null | undefined, categoryId: string): string {
  if (icon && Object.hasOwn(categoryIconOptions, icon))
    return chartTones[categoryIconOptions[icon as CategoryIconName].tone];
  let hash = 0;
  for (const character of categoryId) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return chartTones[fallbackTones[hash % fallbackTones.length]!];
}
