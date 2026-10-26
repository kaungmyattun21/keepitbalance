import { userAdditionalFields } from "@keepitbalance/shared/auth";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: "/api/v1/auth",
  // Look up fetch per request; Better Auth would otherwise keep the one that existed at startup.
  fetchOptions: { customFetchImpl: (input, init) => fetch(input, init) },
  plugins: [inferAdditionalFields({ user: userAdditionalFields })],
});

export type Session = typeof authClient.$Infer.Session;
