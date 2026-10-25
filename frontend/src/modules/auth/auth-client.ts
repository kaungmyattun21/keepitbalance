// Better Auth's browser client (D-018). Used only inside the auth module; other modules use the
// hooks this module exports (Phase 3), never the client directly.
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Same origin thanks to the dev proxy (D-020). Passed explicitly so the client doesn't guess from env vars.
  baseURL: window.location.origin,
  basePath: "/api/v1/auth", // must match basePath in backend/src/modules/auth/auth.ts
  plugins: [
    // The frontend can't import the backend's `auth` type (separate apps, D-013), so the extra
    // user field from auth.ts (user.additionalFields) is described here.
    inferAdditionalFields({
      user: { timezone: { type: "string", required: false } },
    }),
  ],
});

export type Session = typeof authClient.$Infer.Session;
