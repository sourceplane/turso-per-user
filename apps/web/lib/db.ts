// The signed-in user's own database: its name from their Clerk user id
// (lib/turso.ts), reached over HTTP with the group's token. The web client
// (`@libsql/client/web`) is the one that runs on Workers: it speaks libSQL's
// HTTP protocol with fetch and carries no native module.
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql/web";
import { redirect } from "next/navigation";

import * as schema from "@/db/schema";
import type { TodoDatabase } from "./todos";
import { databaseHost, databaseName, tursoConfig } from "./turso";

export async function currentDatabaseName(): Promise<string | null> {
  const { userId } = await auth();
  return userId ? databaseName(userId) : null;
}

export async function getDatabaseClient(): Promise<TodoDatabase | null> {
  const config = tursoConfig();
  if (!config) return null;

  const name = await currentDatabaseName();
  if (!name) {
    console.error("Failed to create database client: no signed-in user.");
    return redirect("/welcome");
  }

  try {
    const client = createClient({
      url: `libsql://${databaseHost(name, config.org)}`,
      authToken: config.groupToken,
    });
    return drizzle(client, { schema });
  } catch (error) {
    console.error("Failed to create database client:", error);
    return null;
  }
}

// Turso's SQL dump of the signed-in user's database, for "Download my data".
export async function getDumpUrl(): Promise<string | null> {
  const config = tursoConfig();
  const name = await currentDatabaseName();
  return config && name ? `https://${databaseHost(name, config.org)}/dump` : null;
}
