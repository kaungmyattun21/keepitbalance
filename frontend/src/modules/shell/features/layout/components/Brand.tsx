import { Scale } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/shared/lib/utils";

export function Brand({ iconOnly = false }: { iconOnly?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2 font-heading font-semibold">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Scale className="size-4" aria-hidden />
      </span>
      <span className={cn(iconOnly && "sr-only")}>KeepItBalance</span>
    </Link>
  );
}
