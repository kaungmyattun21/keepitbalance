import { useState } from "react";
import { env } from "@/shared/lib/env";

export function ReceiptImage({ imageUrl }: { imageUrl: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="space-y-2">
      <a
        href={`${env.apiBaseUrl}${imageUrl}`}
        target="_blank"
        rel="noreferrer"
        className="block rounded-xl bg-muted/35 focus-visible:outline-2 focus-visible:outline-ring"
        aria-label="Open original receipt image"
      >
        {!failed && (
          <img
            src={`${env.apiBaseUrl}${imageUrl}`}
            crossOrigin="use-credentials"
            alt="Attached receipt"
            className="max-h-72 w-full rounded-xl object-contain"
            onError={() => setFailed(true)}
          />
        )}
        <span className="block p-2 text-center text-xs text-brand">
          {failed ? "Preview unavailable. Open original receipt." : "View original receipt"}
        </span>
      </a>
    </div>
  );
}
