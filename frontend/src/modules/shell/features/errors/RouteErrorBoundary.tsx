import { TriangleAlert } from "lucide-react";
import { isRouteErrorResponse, useRevalidator, useRouteError } from "react-router";
import { Button } from "@/shared/components/ui/button";
import { PageMessage } from "@/shared/components/PageMessage";
import { ApiError } from "@/shared/lib/api";
import { NotFoundPage } from "./NotFoundPage.tsx";

export function RouteErrorBoundary() {
  const error = useRouteError();
  const revalidator = useRevalidator();

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  if (!(error instanceof ApiError)) console.error(error);

  return (
    <PageMessage
      icon={TriangleAlert}
      title="Couldn't load this page"
      description={error instanceof ApiError ? error.message : "Something went wrong. Please try again."}
      action={
        <Button onClick={() => void revalidator.revalidate()} disabled={revalidator.state === "loading"}>
          Try again
        </Button>
      }
    />
  );
}
