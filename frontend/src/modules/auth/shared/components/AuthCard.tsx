import type { ReactNode } from "react";
import { DocumentTitle } from "@/shared/components/DocumentTitle";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

type AuthCardProps = {
  title: string;
  description?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export function AuthCard({ title, description, footer, children }: AuthCardProps) {
  return (
    <Card className="shadow-none [--card-spacing:--spacing(7)] sm:[--card-spacing:--spacing(8)]">
      <DocumentTitle title={title} />
      <CardHeader className="gap-1.5">
        <CardTitle>
          <h1 className="font-heading text-2xl font-medium tracking-tight">{title}</h1>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-5">{children}</CardContent>
      {footer && <CardFooter className="justify-center text-sm text-muted-foreground">{footer}</CardFooter>}
    </Card>
  );
}
