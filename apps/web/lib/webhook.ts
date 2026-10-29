// Clerk's webhook: a new user's database, created in the background when they
// sign up (upstream's optional webhook setup), so their first visit to the
// dashboard does not wait on it.
//
// The signature is checked FIRST, against the request's raw body, before the
// body is parsed or anything is done with it: Svix signs the exact bytes it
// sent, and a body parsed and re-serialised (as upstream checked it) is not
// guaranteed to be those bytes. Only `user.created` creates anything.
import { Webhook } from "svix";

import { createUserDatabase, missingTursoKeys, tursoConfig, type TursoConfig } from "./turso";

type Env = Record<string, string | undefined>;

export const ALLOWED_EVENTS = ["user.created"];

interface ClerkEvent {
  type: string;
  data: { id?: string };
}

export interface WebhookDeps {
  createUserDatabase: (config: TursoConfig, userId: string) => Promise<boolean>;
}

export async function handleClerkWebhook(
  rawBody: string,
  headers: Headers,
  env: Env = process.env,
  deps: WebhookDeps = { createUserDatabase },
): Promise<Response> {
  const secret = env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    // Upstream threw (a 500); the webhook is optional, so an endpoint nobody
    // has given a secret yet says so.
    return Response.json(
      { error: "The Clerk webhook is not connected", missing: ["CLERK_WEBHOOK_SECRET"] },
      { status: 503 },
    );
  }

  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Error occurred -- no svix headers", { status: 400 });
  }

  let evt: ClerkEvent;
  try {
    evt = new Webhook(secret).verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", { status: 400 });
  }

  const id = evt.data?.id;
  if (!id) return new Response("No ID found", { status: 400 });
  if (!ALLOWED_EVENTS.includes(evt.type)) return new Response("Event not allowed", { status: 400 });

  const config = tursoConfig(env);
  if (!config) {
    return Response.json(
      { error: "Turso is not connected", missing: missingTursoKeys(env) },
      { status: 503 },
    );
  }

  try {
    const success = await deps.createUserDatabase(config, id);
    if (!success) return new Response("Error creating database", { status: 500 });
  } catch (err) {
    console.error("Error processing webhook:", err);
    return new Response("Error occurred", { status: 500 });
  }

  return new Response();
}
