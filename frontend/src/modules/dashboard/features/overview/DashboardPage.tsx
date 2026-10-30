import { HeartPulse, UtensilsCrossed, Wallet } from "lucide-react";
import { useCurrentUser } from "@/modules/auth";
import { Page } from "@/shared/components/Page";
import { cn } from "@/shared/lib/utils";
import { ModuleCard } from "./components/ModuleCard.tsx";
import { useApiStatus } from "./hooks/use-api-status.ts";

const appModules = [
  {
    title: "Finance",
    description: "Income, expenses and your monthly summary.",
    icon: Wallet,
    to: "/finance",
  },
  {
    title: "Groceries",
    description: "Shopping lists, pantry stock and grocery spending.",
    icon: UtensilsCrossed,
    to: "/meals",
  },
  { title: "Health", description: "Daily water and calorie goals.", icon: HeartPulse },
];

export function DashboardPage() {
  const user = useCurrentUser();
  const apiStatus = useApiStatus();
  const apiHealthy = apiStatus.status === "ok";

  return (
    <Page title="Dashboard" description={`Welcome back, ${user.name}. Everything you track lives here.`}>
      <section aria-labelledby="modules-heading" className="flex flex-col gap-4">
        <h2 id="modules-heading" className="text-sm font-medium text-muted-foreground">
          Modules
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {appModules.map((appModule) => (
            <li key={appModule.title}>
              <ModuleCard {...appModule} />
            </li>
          ))}
        </ul>
      </section>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <span
          aria-hidden
          className={cn("size-1.5 rounded-full", apiHealthy ? "bg-brand" : "bg-destructive")}
        />
        API status: <span data-testid="api-status">{apiStatus.status}</span>
      </p>
    </Page>
  );
}
