import { Link } from "react-router";
import { BrandMark } from "@/shared/components/BrandMark";
import { cn } from "@/shared/lib/utils";

export function Brand({ iconOnly = false }: { iconOnly?: boolean }) {
  return (
    <Link
      to="/"
      className="flex min-w-0 items-center gap-2.5 rounded-lg font-heading font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <BrandMark />
      <span className={cn("min-w-0 truncate", iconOnly && "sr-only")}>KeepItBalance</span>
    </Link>
  );
}
