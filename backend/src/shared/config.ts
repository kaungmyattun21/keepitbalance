import "dotenv/config";
import { z } from "zod";

// An empty value in .env (GOOGLE_CLIENT_ID=) counts as not set.
const optional = z
  .string()
  .optional()
  .transform((value) => value || undefined);

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.url(),
    WEB_URL: z.url().default("http://localhost:5173"),
    BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
    // Changing it logs everyone out.
    BETTER_AUTH_SECRET: z.string().min(32, "Must be at least 32 characters"),
    GOOGLE_CLIENT_ID: optional,
    GOOGLE_CLIENT_SECRET: optional,
  })
  .refine((env) => !env.GOOGLE_CLIENT_ID === !env.GOOGLE_CLIENT_SECRET, {
    message: "Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or neither",
    path: ["GOOGLE_CLIENT_SECRET"],
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:\n" + z.prettifyError(parsed.error));
  process.exit(1);
}

const env = parsed.data;

export const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  webUrl: env.WEB_URL,
  auth: {
    url: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    google:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
        : undefined,
  },
} as const;
