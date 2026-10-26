const AUTH_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password", "/verified"];

export const PUBLIC_PATHS = new Set(AUTH_PATHS);

export function safeRedirectPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  const pathname = value.split(/[?#]/)[0] ?? "";
  return PUBLIC_PATHS.has(pathname) ? "/" : value;
}

export function loginPathFor(url: URL): string {
  const from = url.pathname + url.search;
  return from === "/" ? "/login" : `/login?redirectTo=${encodeURIComponent(from)}`;
}

export function absoluteUrl(path: string): string {
  return new URL(path, window.location.origin).toString();
}
