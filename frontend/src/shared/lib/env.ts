const DEFAULT_API_BASE_URL = "/api/v1";

function readApiBaseUrl(): string {
  const value = import.meta.env.VITE_API_BASE_URL?.trim();
  return (value || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
}

export const env = {
  apiBaseUrl: readApiBaseUrl(),
} as const;
