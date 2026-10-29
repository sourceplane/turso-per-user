import { createHash } from "node:crypto";
import * as http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createUserDatabase,
  databaseExists,
  databaseHost,
  databaseName,
  missingTursoKeys,
  tursoConfig,
} from "lib/turso";

const KEYS = {
  TURSO_API_TOKEN: "platform-token-fixture",
  TURSO_ORG: "acme-org",
  TURSO_DATABASE_NAME: "seed-db",
  TURSO_GROUP_AUTH_TOKEN: "group-token-fixture",
};

describe("Turso's connection (lib/turso.ts)", () => {
  it("is not connected until all four values are there, and names what is missing", () => {
    expect(tursoConfig({})).toBeNull();
    expect(missingTursoKeys({})).toEqual(Object.keys(KEYS));
    const partial = { TURSO_API_TOKEN: "x", TURSO_ORG: "y" };
    expect(tursoConfig(partial)).toBeNull();
    expect(missingTursoKeys(partial)).toEqual(["TURSO_DATABASE_NAME", "TURSO_GROUP_AUTH_TOKEN"]);
  });

  it("reads the four values, and the stand-in's origin only when one is given", () => {
    expect(tursoConfig(KEYS)).toEqual({
      apiToken: KEYS.TURSO_API_TOKEN,
      org: KEYS.TURSO_ORG,
      seedDatabase: KEYS.TURSO_DATABASE_NAME,
      groupToken: KEYS.TURSO_GROUP_AUTH_TOKEN,
      apiBaseUrl: undefined,
    });
    expect(tursoConfig({ ...KEYS, TURSO_API_BASE_URL: "http://127.0.0.1:9/v1/" })?.apiBaseUrl).toBe(
      "http://127.0.0.1:9/v1/",
    );
  });

  it("names a user's database after their Clerk id, hashed, as upstream", () => {
    const id = "user_2nZ0ExampleClerkId";
    expect(databaseName(id)).toBe(createHash("md5").update(id).digest("hex"));
    expect(databaseName(id)).toMatch(/^[0-9a-f]{32}$/);
    expect(databaseHost(databaseName(id), "acme-org")).toBe(`${databaseName(id)}-acme-org.turso.io`);
  });
});

// A local stand-in of Turso's Platform API: what the two calls send.
describe("the Platform API calls (lib/turso.ts)", () => {
  const seen: { method: string; url: string; auth?: string; body: unknown }[] = [];
  const existing = new Set<string>();
  let server: http.Server;
  let base: string;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        seen.push({ method: req.method!, url: req.url!, auth: req.headers.authorization, body: raw ? JSON.parse(raw) : null });
        res.setHeader("content-type", "application/json");
        const m = req.url!.match(/^\/v1\/organizations\/([^/]+)\/databases(?:\/([^/]+))?$/);
        if (!m) return res.writeHead(404).end(JSON.stringify({ error: "not found" }));
        if (req.method === "GET" && m[2]) {
          if (!existing.has(m[2])) return res.writeHead(404).end(JSON.stringify({ error: "database not found" }));
          return res.end(JSON.stringify({ database: { Name: m[2], DbId: "id", Hostname: `${m[2]}-${m[1]}.turso.io` } }));
        }
        if (req.method === "POST" && !m[2]) {
          const name = (JSON.parse(raw) as { name: string }).name;
          existing.add(name);
          return res.end(JSON.stringify({ database: { Name: name, DbId: "id", Hostname: `${name}-${m[1]}.turso.io` } }));
        }
        return res.writeHead(405).end(JSON.stringify({ error: "method" }));
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1/`;
  });
  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  it("creates a user's database in the default group from the seed, with the Platform API token", async () => {
    const config = tursoConfig({ ...KEYS, TURSO_API_BASE_URL: base })!;
    const id = "user_created_by_webhook";
    expect(await databaseExists(config, databaseName(id))).toBe(false);
    expect(await createUserDatabase(config, id)).toBe(true);
    expect(await databaseExists(config, databaseName(id))).toBe(true);
    const create = seen.find((s) => s.method === "POST")!;
    expect(create.url).toBe("/v1/organizations/acme-org/databases");
    expect(create.auth).toBe(`Bearer ${KEYS.TURSO_API_TOKEN}`);
    expect(create.body).toEqual({
      name: databaseName(id),
      group: "default",
      seed: { type: "database", name: KEYS.TURSO_DATABASE_NAME },
    });
  });

  it("answers false, not a throw, when the API refuses", async () => {
    const config = tursoConfig({ ...KEYS, TURSO_ORG: "no/such", TURSO_API_BASE_URL: base })!;
    expect(await createUserDatabase(config, "user_x")).toBe(false);
    expect(await createUserDatabase(config, "")).toBe(false);
  });
});
