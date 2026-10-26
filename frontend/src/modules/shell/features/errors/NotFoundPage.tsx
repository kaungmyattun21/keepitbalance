import { Link } from "react-router";
import { Button } from "@/shared/components/ui/button";
import { PageMessage } from "@/shared/components/PageMessage";

export function NotFoundPage() {
  return (
    <PageMessage
      title="Page not found"
      description="The page you're looking for doesn't exist or has moved."
      action={
        <Button asChild variant="outline">
          <Link to="/">Back to dashboard</Link>
        </Button>
      }
    />
  );
}
