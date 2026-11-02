import { cn } from "@/shared/lib/utils";
import { useId, type ReactNode } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

type SectionCardProps = {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function SectionCard({ title, description, action, className, children }: SectionCardProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={cn("max-w-full min-w-0", className)}>
      <Card className="gap-0 py-0">
        <CardHeader className="flex min-w-0 flex-col flex-wrap items-stretch justify-between gap-4 border-b border-border/60 px-4 py-5 sm:flex-row sm:items-center sm:px-6 sm:py-6">
          <div className="min-w-0 space-y-1 wrap-anywhere sm:flex-1 sm:basis-40">
            <CardTitle>
              <h2 id={headingId}>{title}</h2>
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {action && (
            <CardAction className="w-full max-w-full min-w-0 self-start sm:w-auto sm:self-center">
              {action}
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="@container/section min-w-0 px-4 py-5 sm:px-6">{children}</CardContent>
      </Card>
    </section>
  );
}
