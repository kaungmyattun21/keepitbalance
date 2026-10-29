import type { ReactNode } from "react";
import { DocumentTitle } from "./DocumentTitle.tsx";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

type PageProps = PageHeaderProps & { children: ReactNode };

export function Page({ title, description, actions, children }: PageProps) {
  return (
    <div className="flex flex-col gap-8">
      <DocumentTitle title={title} />
      <PageHeader title={title} description={description} actions={actions} />
      {children}
    </div>
  );
}
