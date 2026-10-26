import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";

export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Alert variant="destructive">
      <CircleAlert aria-hidden />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
