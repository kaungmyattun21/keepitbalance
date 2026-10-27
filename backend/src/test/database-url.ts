import { config } from "dotenv";

// Tests run against <dev database>_test (or TEST_DATABASE_URL), never the dev database itself.
export function testDatabaseUrl(): string {
  config({ quiet: true });
  const explicit = process.env.TEST_DATABASE_URL;
  const base = explicit ?? process.env.DATABASE_URL;
  if (!base) throw new Error("Set DATABASE_URL or TEST_DATABASE_URL to run the backend tests");

  const url = new URL(base);
  if (!explicit) url.pathname = `${url.pathname.replace(/\/$/, "")}_test`;

  const databaseName = url.pathname.slice(1);
  if (!databaseName.endsWith("_test")) {
    throw new Error(`Refusing to run tests against "${databaseName}": the name must end with _test`);
  }
  return url.toString();
}
