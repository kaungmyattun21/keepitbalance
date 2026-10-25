// Build-time settings, validated once. Import `env` instead of reading import.meta.env.
import { z } from "zod";

const envSchema = z.object({
  // Relative by default: the Vite dev proxy (D-020) and, in production, the frontend host forward /api.
  // Set an absolute URL only if the API is served from another origin (then CORS applies).
  VITE_API_BASE_URL: z.string().min(1).default("/api/v1"),
  DEV: z.boolean(),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  throw new Error("Invalid frontend environment variables:\n" + z.prettifyError(parsed.error));
}

export const env = {
  apiBaseUrl: parsed.data.VITE_API_BASE_URL.replace(/\/$/, ""),
  isDev: parsed.data.DEV,
} as const;
