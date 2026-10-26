import type { ReactNode } from "react";

type PageMessageProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function PageMessage({ title, description, action }: PageMessageProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <h1 className="font-heading text-2xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
