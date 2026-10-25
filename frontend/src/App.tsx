// Phase 0 placeholder: proves Tailwind, shadcn/ui and the /api proxy work.
// Replaced by the router and app shell (src/app/) in Phase 1.
import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/button";

type Health = "checking" | "ok" | "unreachable";

export function App() {
  const [health, setHealth] = useState<Health>("checking");

  useEffect(() => {
    fetch("/api/v1/health")
      .then((res) => setHealth(res.ok ? "ok" : "unreachable"))
      .catch(() => setHealth("unreachable"));
  }, []);

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="font-heading text-3xl font-semibold">KeepItBalance</h1>
      <p className="text-muted-foreground">
        API: <span data-testid="api-health">{health}</span>
      </p>
      <Button onClick={() => document.documentElement.classList.toggle("dark")}>Toggle theme</Button>
    </main>
  );
}
