import { CircleCheck, CircleX } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { Button } from "@/shared/components/ui/button";
import { AuthCard } from "../../shared/components/AuthCard.tsx";
import { refetchSession, useSession } from "../../shared/session.ts";

export async function loader() {
  await refetchSession();
  return null;
}

export function Component() {
  const [searchParams] = useSearchParams();
  const session = useSession();
  const error = searchParams.get("error");
  const next = session ? { to: "/", label: "Continue to KeepItBalance" } : { to: "/login", label: "Log in" };

  if (error) {
    return (
      <AuthCard title={error === "TOKEN_EXPIRED" ? "Link expired" : "Link not valid"}>
        <div className="flex flex-col items-center gap-3 text-center">
          <CircleX className="size-8 text-destructive" aria-hidden />
          <p className="text-sm text-muted-foreground">
            This verification link can't be used anymore. Log in and use "Resend email" in the banner at the
            top to get a new one.
          </p>
          <Button asChild variant="outline">
            <Link to={next.to}>{next.label}</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Email verified">
      <div className="flex flex-col items-center gap-3 text-center">
        <CircleCheck className="size-8 text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">Thanks! Your email address is confirmed.</p>
        <Button asChild>
          <Link to={next.to}>{next.label}</Link>
        </Button>
      </div>
    </AuthCard>
  );
}
