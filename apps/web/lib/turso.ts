// Turso: one database per user, created through Turso's Platform API.
//
// Turso stays the SaaS it is upstream. Its four values are the Worker's
// secrets (Orun secrets the deploy hands over, README → Connect Turso), read
// per request: a deploy without them still serves the site, and a signed-in
// user is told Turso is not connected yet, never a 500. Only names ever leave
// this module, never a value.
import { createClient as createPlatformClient } from "@tursodatabase/api";
import md5 from "md5";

type Env = Record<string, string | undefined>;

export const TURSO_KEYS = [
  "TURSO_API_TOKEN",
  "TURSO_ORG",
  "TURSO_DATABASE_NAME",
  "TURSO_GROUP_AUTH_TOKEN",
] as const;

// The group every user's database is created in, as upstream.
export const TURSO_GROUP = "default";

export interface TursoConfig {
  // The Platform API token (`turso auth api-tokens mint`): creates databases.
  apiToken: string;
  org: string;
  // The seed database: every user's database starts as a copy of it.
  seedDatabase: string;
  // The group's database token: reads and writes each user's database.
  groupToken: string;
  // The Platform API's origin. Unset in a deployment (the client's default,
  // https://api.turso.tech/v1/); the end-to-end tier points it at a stand-in.
  apiBaseUrl?: string;
}

export function tursoConfig(env: Env = process.env): TursoConfig | null {
  if (TURSO_KEYS.some((key) => !env[key])) return null;
  return {
    apiToken: env.TURSO_API_TOKEN!,
    org: env.TURSO_ORG!,
    seedDatabase: env.TURSO_DATABASE_NAME!,
    groupToken: env.TURSO_GROUP_AUTH_TOKEN!,
    apiBaseUrl: env.TURSO_API_BASE_URL || undefined,
  };
}

// The names Turso still needs, for the notice and the 503.
export function missingTursoKeys(env: Env = process.env): string[] {
  return TURSO_KEYS.filter((key) => !env[key]);
}

// A user's database is named after their Clerk user id, hashed (Turso's
// names are lowercase letters, digits and dashes), as upstream.
export function databaseName(userId: string): string {
  return md5(userId);
}

export function databaseHost(name: string, org: string): string {
  return `${name}-${org}.turso.io`;
}

function platform(config: TursoConfig) {
  return createPlatformClient({
    token: config.apiToken,
    org: config.org,
    ...(config.apiBaseUrl ? { baseUrl: config.apiBaseUrl } : {}),
  });
}

export async function databaseExists(config: TursoConfig, name: string): Promise<boolean> {
  try {
    await platform(config).databases.get(name);
    return true;
  } catch (error) {
    console.error("Error checking database existence:", error);
    return false;
  }
}

export async function createUserDatabase(config: TursoConfig, userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    await platform(config).databases.create(databaseName(userId), {
      group: TURSO_GROUP,
      seed: { type: "database", name: config.seedDatabase },
    });
    return true;
  } catch (err) {
    console.error("Error creating user database:", err);
    return false;
  }
}
