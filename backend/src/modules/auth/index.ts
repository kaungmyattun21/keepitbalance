// Public API of the Auth module (D-014). Other modules import only from here.
export { auth, onUserCreated } from "./auth.ts";
export { requireAuth, getUserId } from "./require-auth.ts";
export { meRoutes } from "./me/routes.ts";
