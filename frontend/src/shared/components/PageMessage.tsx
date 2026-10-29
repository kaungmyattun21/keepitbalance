import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { DocumentTitle } from "./DocumentTitle.tsx";

type PageMessageProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
};

export function PageMessage({ title, description, icon: Icon, action }: PageMessageProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <DocumentTitle title={title} />
      {Icon && (
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-border">
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
