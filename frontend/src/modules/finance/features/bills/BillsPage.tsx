import { CalendarClock } from "lucide-react";
import { ComingSoonSection } from "../../shared/components/ComingSoonSection.tsx";

export function BillsPage() {
  return (
    <ComingSoonSection
      title="Bills"
      description="Track recurring bills, see what's due next, and record a payment in one tap."
      icon={CalendarClock}
    />
  );
}
