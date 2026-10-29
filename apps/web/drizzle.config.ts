import { defineConfig } from "drizzle-kit";

// `pnpm db:migrate` applies migrations/ to the SEED database — the one every
// user's database is created from (TURSO_DATABASE_NAME) — with the group's
// token. A database created after that starts with the seed's schema; one
// created before it does not (README → Change the schema). Read from the
// shell or a .env.local, never from a committed file.
for (const key of ["TURSO_DATABASE_NAME", "TURSO_ORG", "TURSO_GROUP_AUTH_TOKEN"]) {
  if (!process.env[key]) throw new Error(`${key} is missing`);
}

const url = `libsql://${process.env.TURSO_DATABASE_NAME}-${process.env.TURSO_ORG}.turso.io`;

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./migrations",
  dialect: "turso",
  dbCredentials: {
    url,
    authToken: process.env.TURSO_GROUP_AUTH_TOKEN,
  },
});
