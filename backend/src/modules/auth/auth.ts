// The Better Auth instance (D-018, D-019). It owns the users, sessions, accounts and
// verifications tables and serves every /api/v1/auth/* endpoint.
import argon2 from "argon2";
import { APIError, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { config } from "../../shared/config.ts";
import { prisma } from "../../shared/db.ts";
import { sendEmailInBackground } from "../../shared/mailer.ts";

// Other modules react to signups without Auth importing them (Finance → Auth, never the reverse, D-014).
// app.ts registers the handlers, e.g. onUserCreated(createDefaultCategories).
type UserCreatedHandler = (userId: string) => Promise<void>;
const userCreatedHandlers: UserCreatedHandler[] = [];

export function onUserCreated(handler: UserCreatedHandler): void {
  userCreatedHandlers.push(handler);
}

// Intl.supportedValuesOf("timeZone") misses valid names such as "UTC" and "Asia/Yangon",
// so ask the formatter instead: it throws a RangeError for unknown time zones.
function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export const auth = betterAuth({
  appName: "KeepItBalance",
  baseURL: config.auth.url,
  basePath: "/api/v1/auth",
  secret: config.auth.secret,
  // Requests from other origins are rejected, and redirects (callbackURL) may only go here.
  trustedOrigins: [config.webUrl],

  database: prismaAdapter(prisma, { provider: "postgresql" }),

  user: {
    additionalFields: {
      // Sent at signup by the frontend (Intl.DateTimeFormat().resolvedOptions().timeZone).
      timezone: { type: "string", required: false, defaultValue: "UTC", input: true },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // extend the expiry at most once a day while the user is active
  },

  emailAndPassword: {
    enabled: true,
    autoSignIn: true, // FR-1: signing up logs you in
    requireEmailVerification: false, // verification matters for account linking only (D-019)
    minPasswordLength: 8,
    maxPasswordLength: 128,
    password: {
      // argon2id instead of Better Auth's default scrypt (NFR-1).
      hash: (password) => argon2.hash(password),
      verify: ({ hash, password }) => argon2.verify(hash, password),
    },
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
    revokeSessionsOnPasswordReset: true,
    // Emails are sent without awaiting, so the response time doesn't reveal whether the email exists.
    sendResetPassword: async ({ user, url }) => {
      sendEmailInBackground({
        to: user.email,
        subject: "Reset your KeepItBalance password",
        text: `Open this link to choose a new password (valid for 1 hour): ${url}`,
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24, // 1 day
    sendVerificationEmail: async ({ user, url }) => {
      sendEmailInBackground({
        to: user.email,
        subject: "Verify your KeepItBalance email",
        text: `Open this link to verify your email: ${url}`,
      });
    },
  },

  socialProviders: config.auth.google
    ? {
        google: {
          clientId: config.auth.google.clientId,
          clientSecret: config.auth.google.clientSecret,
          prompt: "select_account", // let people pick which Google account to use
        },
      }
    : {},

  account: {
    // Same email = same person, but only when both sides proved it (D-019).
    // Better Auth requires the existing user's email to be verified before linking.
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
    // Google's access/refresh tokens are encrypted with BETTER_AUTH_SECRET before they're stored.
    encryptOAuthTokens: true,
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const timezone = (user as { timezone?: unknown }).timezone;
          if (typeof timezone === "string" && !isValidTimezone(timezone)) {
            throw new APIError("BAD_REQUEST", { message: `Unknown timezone "${timezone}"` });
          }
        },
        after: async (user) => {
          for (const handler of userCreatedHandlers) {
            try {
              await handler(user.id);
            } catch (err) {
              // The user already exists at this point; failing the signup would only confuse them.
              console.error(`onUserCreated handler failed for user ${user.id}:`, err);
            }
          }
        },
      },
    },
  },

  // Errors during browser redirects (e.g. Google sign-in) land on the frontend as /login?error=<code>,
  // for example error=account_not_linked (D-019).
  onAPIError: {
    errorURL: `${config.webUrl}/login`,
  },

  advanced: {
    cookiePrefix: "keepitbalance",
    useSecureCookies: config.isProduction,
    database: {
      generateId: "uuid", // our id columns are uuid
    },
  },
});
