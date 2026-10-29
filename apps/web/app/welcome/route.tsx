import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { clerkConnected } from "@/lib/clerk";
import { createUserDatabase, databaseExists, databaseName, tursoConfig } from "@/lib/turso";

export const dynamic = "force-dynamic";

// A signed-in user without a database yet (no webhook, or it has not run):
// create theirs from the seed, then on to the dashboard. Not connected, the
// sign-in page or the dashboard says what to connect.
export async function GET() {
  if (!clerkConnected) return redirect("/sign-in");

  const { userId } = await auth.protect();

  const config = tursoConfig();
  if (!config) return redirect("/dashboard");

  const databaseAlreadyExists = await databaseExists(config, databaseName(userId));

  if (databaseAlreadyExists) {
    return redirect("/dashboard");
  }

  try {
    const success = await createUserDatabase(config, userId);

    if (!success) {
      return new Response("Error creating database", {
        status: 500,
      });
    }
  } catch (err) {
    console.error("Error creating database:", err);
    return new Response("Error occurred", {
      status: 500,
    });
  }

  redirect("/dashboard");
}
