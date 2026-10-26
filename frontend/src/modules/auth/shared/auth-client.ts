import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: "/api/v1/auth",
  plugins: [
    inferAdditionalFields({
      user: { timezone: { type: "string", required: false } },
    }),
  ],
});

export type Session = typeof authClient.$Infer.Session;
