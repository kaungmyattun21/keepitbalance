import type { LucideIcon } from "lucide-react";
import { useId } from "react";
import { DocumentTitle } from "@/shared/components/DocumentTitle";

type ComingSoonSectionProps = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export function ComingSoonSection({ title, description, icon: Icon }: ComingSoonSectionProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col items-center gap-4 rounded-xl border border-dashed bg-card/50 px-6 py-16 text-center"
    >
      <DocumentTitle title={title} />
      <span className="flex size-12 items-center justify-center rounded-full bg-brand-subtle text-brand">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="flex max-w-sm flex-col gap-1.5">
        <h2 id={headingId} className="font-heading text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
        Coming soon
      </span>
    </section>
  );
}
