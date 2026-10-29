import { ArrowRight, type LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/shared/lib/utils";

type ModuleCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  to?: string;
};

export function ModuleCard({ title, description, icon: Icon, to }: ModuleCardProps) {
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col gap-5 rounded-xl bg-card p-5 text-card-foreground shadow-xs ring-1 ring-foreground/8 transition-shadow dark:ring-border",
        to && "hover:shadow-md has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring",
      )}
    >
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-lg",
          to ? "bg-brand-subtle text-brand" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>

      <div className="flex flex-col gap-1">
        <h3 className="font-heading font-semibold tracking-tight">
          {to ? (
            <Link to={to} className="outline-none after:absolute after:inset-0 after:rounded-xl">
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="mt-auto text-sm font-medium">
        {to ? (
          <span aria-hidden className="inline-flex items-center gap-1 text-brand">
            Open
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        ) : (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">Coming soon</span>
        )}
      </div>
    </article>
  );
}
