import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { HeartPulse, UtensilsCrossed, Wallet, type LucideIcon } from "lucide-react";
import { useCurrentUser } from "@/modules/auth";
import { api } from "@/shared/lib/api";
import { ensureQuery } from "@/shared/lib/query-client";

const apiStatusQuery = queryOptions({
  queryKey: ["system", "health"],
  queryFn: ({ signal }) => api.get<{ status: string }>("/health", { signal }),
});

export async function loader() {
  await ensureQuery(apiStatusQuery);
  return null;
}

const upcomingModules: { title: string; description: string; icon: LucideIcon }[] = [
  { title: "Finance", description: "Income, expenses and your monthly summary.", icon: Wallet },
  { title: "Meals", description: "Recipes, pantry, meal plans and grocery lists.", icon: UtensilsCrossed },
  { title: "Health", description: "Daily water and calorie goals.", icon: HeartPulse },
];

export function Component() {
  const user = useCurrentUser();
  const { data: apiStatus } = useSuspenseQuery(apiStatusQuery);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <h1 className="font-heading text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.name}. Your overview appears here as each module is added.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {upcomingModules.map(({ title, description, icon: Icon }) => (
          <li key={title} className="rounded-xl border bg-card p-5 text-card-foreground">
            <Icon className="mb-3 size-5 text-muted-foreground" aria-hidden />
            <h2 className="font-medium">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
            <p className="mt-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Coming soon
            </p>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground">
        API status: <span data-testid="api-status">{apiStatus.status}</span>
      </p>
    </div>
  );
}
