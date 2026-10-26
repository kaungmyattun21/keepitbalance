import { createBrowserRouter } from "react-router";
import { routes } from "./routes.ts";
import { redirectToLoginOnSessionExpiry } from "./session-expiry.ts";

export const router = createBrowserRouter(routes);

redirectToLoginOnSessionExpiry(router);
