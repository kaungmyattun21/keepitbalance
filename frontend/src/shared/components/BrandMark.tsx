import { Scale } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-[0.625rem] bg-brand text-brand-foreground shadow-xs ring-1 ring-black/5 ring-inset",
        className,
      )}
    >
      <Scale className="size-[55%]" strokeWidth={2.25} />
    </span>
  );
}
