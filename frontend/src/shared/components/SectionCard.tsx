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
  compactHeader?: boolean;
  children: ReactNode;
};

export function SectionCard({
  title,
  description,
  action,
  className,
  compactHeader = false,
  children,
}: SectionCardProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={cn("flex max-w-full min-w-0 flex-col", className)}>
      <Card className="flex-1 gap-0 py-0">
        <CardHeader
          className={cn(
            "flex min-w-0 shrink-0 flex-col flex-wrap items-stretch justify-between gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6 sm:py-5",
            compactHeader && "min-h-18 flex-row items-center sm:min-h-18",
          )}
        >
          <div className={cn("min-w-0 space-y-1 wrap-anywhere sm:flex-1", !compactHeader && "sm:basis-40")}>
            <CardTitle>
              <h2 id={headingId}>{title}</h2>
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {action && (
            <CardAction
              className={cn(
                "max-w-full min-w-0",
                compactHeader ? "w-auto self-center" : "w-full self-start sm:w-auto sm:self-center",
              )}
            >
              {action}
            </CardAction>
          )}
        </CardHeader>
        <CardContent
          className={cn(
            "@container/section min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-5",
            compactHeader && "flex flex-col",
          )}
        >
          {children}
        </CardContent>
      </Card>
    </section>
  );
}
