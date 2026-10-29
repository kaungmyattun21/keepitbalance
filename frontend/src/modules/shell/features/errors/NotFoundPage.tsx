import { Compass } from "lucide-react";
import { Link } from "react-router";
import { PageMessage } from "@/shared/components/PageMessage";
import { Button } from "@/shared/components/ui/button";

export function NotFoundPage() {
  return (
    <PageMessage
      icon={Compass}
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
