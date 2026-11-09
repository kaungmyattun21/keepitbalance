import type { CategoryIconName } from "@keepitbalance/shared/finance";
import { cn } from "@/shared/lib/utils";
import { categoryIconOptions, categoryIconTones } from "../category-icons";

export function CategoryIcon({
  icon,
  className,
  variant = "badge",
}: {
  icon?: string | null;
  className?: string;
  variant?: "badge" | "plain";
}) {
  if (!icon || !Object.hasOwn(categoryIconOptions, icon)) return null;
  const { icon: Icon, tone } = categoryIconOptions[icon as CategoryIconName];
  if (variant === "plain")
    return (
      <Icon
        className={cn(
          "size-4 shrink-0",
          categoryIconTones[tone],
          "bg-transparent dark:bg-transparent",
          className,
        )}
        aria-hidden
      />
    );
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-xl",
        categoryIconTones[tone],
        className,
      )}
    >
      <Icon className="size-4" strokeWidth={1.8} />
    </span>
  );
}
