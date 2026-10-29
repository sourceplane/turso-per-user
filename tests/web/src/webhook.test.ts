import { randomBytes } from "node:crypto";
import { Webhook } from "svix";
import { describe, expect, it, vi } from "vitest";

import { handleClerkWebhook } from "lib/webhook";

// Clerk's webhook, as Svix delivers it: signed over the exact bytes sent.
const SECRET = `whsec_${randomBytes(24).toString("base64")}`;
const OTHER = `whsec_${randomBytes(24).toString("base64")}`;
const TURSO = {
  TURSO_API_TOKEN: "platform-token-fixture",
  TURSO_ORG: "acme-org",
  TURSO_DATABASE_NAME: "seed-db",
  TURSO_GROUP_AUTH_TOKEN: "group-token-fixture",
};
const ENV = { CLERK_WEBHOOK_SECRET: SECRET, ...TURSO };

function delivery(event: unknown, { secret = SECRET, at = new Date() } = {}) {
  const body = JSON.stringify(event);
  const id = `msg_${randomBytes(8).toString("hex")}`;
  const headers = new Headers({
    "svix-id": id,
    "svix-timestamp": String(Math.floor(at.getTime() / 1000)),
    "svix-signature": new Webhook(secret).sign(id, at, body),
  });
  return { body, headers };
}

const created = { type: "user.created", data: { id: "user_2nZ0ExampleClerkId" } };

function deps(result = true) {
  return { createUserDatabase: vi.fn(async () => result) };
}

describe("Clerk's webhook (lib/webhook.ts)", () => {
  it("creates the new user's database for a signed user.created", async () => {
    const d = deps();
    const { body, headers } = delivery(created);
    const res = await handleClerkWebhook(body, headers, ENV, d);
    expect(res.status).toBe(200);
    expect(d.createUserDatabase).toHaveBeenCalledOnce();
    expect(d.createUserDatabase).toHaveBeenCalledWith(
      expect.objectContaining({ org: "acme-org", seedDatabase: "seed-db" }),
      "user_2nZ0ExampleClerkId",
    );
  });

  it("refuses a delivery signed with another secret, and does nothing", async () => {
    const d = deps();
    const { body, headers } = delivery(created, { secret: OTHER });
    expect((await handleClerkWebhook(body, headers, ENV, d)).status).toBe(400);
    expect(d.createUserDatabase).not.toHaveBeenCalled();
  });

  it("refuses a stale delivery (outside Svix's five minutes), and does nothing", async () => {
    const d = deps();
    const { body, headers } = delivery(created, { at: new Date(Date.now() - 10 * 60 * 1000) });
    expect((await handleClerkWebhook(body, headers, ENV, d)).status).toBe(400);
    expect(d.createUserDatabase).not.toHaveBeenCalled();
  });

  it("refuses a body changed after it was signed", async () => {
    const d = deps();
    const { headers } = delivery(created);
    const forged = JSON.stringify({ type: "user.created", data: { id: "user_someone_else" } });
    expect((await handleClerkWebhook(forged, headers, ENV, d)).status).toBe(400);
    expect(d.createUserDatabase).not.toHaveBeenCalled();
  });

  it("checks the raw bytes: the same event with other whitespace is not what was signed", async () => {
    const d = deps();
    const { body, headers } = delivery(created);
    const reformatted = JSON.stringify(JSON.parse(body), null, 2);
    expect((await handleClerkWebhook(reformatted, headers, ENV, d)).status).toBe(400);
    expect(d.createUserDatabase).not.toHaveBeenCalled();
  });

  it("refuses a request without Svix's headers", async () => {
    const d = deps();
    const res = await handleClerkWebhook(JSON.stringify(created), new Headers(), ENV, d);
    expect(res.status).toBe(400);
    expect(d.createUserDatabase).not.toHaveBeenCalled();
  });

  it("creates nothing for any other event, signed or not", async () => {
    const d = deps();
    const { body, headers } = delivery({ type: "user.updated", data: { id: "user_2nZ0ExampleClerkId" } });
    expect((await handleClerkWebhook(body, headers, ENV, d)).status).toBe(400);
    expect(d.createUserDatabase).not.toHaveBeenCalled();
  });

  it("says it is not connected without its secret (upstream threw), before reading anything", async () => {
    const d = deps();
    const { body, headers } = delivery(created);
    const res = await handleClerkWebhook(body, headers, TURSO, d);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      error: "The Clerk webhook is not connected",
      missing: ["CLERK_WEBHOOK_SECRET"],
    });
    expect(d.createUserDatabase).not.toHaveBeenCalled();
  });

  it("says Turso is not connected for a signed event when Turso's values are missing", async () => {
    const d = deps();
    const { body, headers } = delivery(created);
    const res = await handleClerkWebhook(body, headers, { CLERK_WEBHOOK_SECRET: SECRET }, d);
    expect(res.status).toBe(503);
    expect((await res.json()).missing).toEqual(Object.keys(TURSO));
    expect(d.createUserDatabase).not.toHaveBeenCalled();
  });

  it("answers 500 when the database could not be created", async () => {
    const { body, headers } = delivery(created);
    expect((await handleClerkWebhook(body, headers, ENV, deps(false))).status).toBe(500);
  });
});
