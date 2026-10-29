import { useId, type ReactNode } from "react";
import { FieldIdPrefixContext } from "./field-id-scope.ts";

// Gives every field inside its own ids, so two forms on one page never share an id.
export function FieldIdScope({ children }: { children: ReactNode }) {
  const prefix = useId();
  return <FieldIdPrefixContext value={prefix}>{children}</FieldIdPrefixContext>;
}
