import { hash, verify } from "argon2";
import { APIError, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
  isValidTimezone,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  userAdditionalFields,
} from "@keepitbalance/shared/auth";
import { config } from "../../../shared/config.ts";
import { prisma } from "../../../shared/db.ts";
import { sendEmailInBackground } from "../../../shared/mailer.ts";

// Lets other modules react to signups without auth depending on them; handlers are registered in app.ts.
type UserCreatedHandler = (userId: string) => Promise<void>;
const userCreatedHandlers: UserCreatedHandler[] = [];

export function onUserCreated(handler: UserCreatedHandler): void {
  userCreatedHandlers.push(handler);
}

export const auth = betterAuth({
  appName: "KeepItBalance",
  baseURL: config.auth.url,
  basePath: "/api/v1/auth",
  secret: config.auth.secret,
  trustedOrigins: [config.webUrl],

  database: prismaAdapter(prisma, { provider: "postgresql" }),

  user: {
    additionalFields: userAdditionalFields,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    password: {
      hash: (password) => hash(password),
      verify: ({ hash: passwordHash, password }) => verify(passwordHash, password),
    },
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    // Not awaited, so response timing doesn't reveal whether the email exists.
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
    expiresIn: 60 * 60 * 24,
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
          prompt: "select_account",
        },
      }
    : {},

  account: {
    // Linking also requires the existing user's email to be verified (Better Auth default).
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
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
              // The user already exists here; failing the signup would only confuse them.
              console.error(`onUserCreated handler failed for user ${user.id}:`, err);
            }
          }
        },
      },
    },
  },

  onAPIError: {
    errorURL: `${config.webUrl}/login`,
  },

  advanced: {
    cookiePrefix: "keepitbalance",
    useSecureCookies: config.isProduction,
    database: {
      generateId: "uuid",
    },
  },
});
