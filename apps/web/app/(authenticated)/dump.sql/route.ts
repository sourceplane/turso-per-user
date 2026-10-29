import { auth } from "@clerk/nextjs/server";

import { clerkConnected } from "@/lib/clerk";
import { getDumpUrl } from "@/lib/db";
import { missingTursoKeys, tursoConfig } from "@/lib/turso";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!clerkConnected) return new Response("Clerk is not connected yet", { status: 503 });

  await auth.protect();

  const config = tursoConfig();
  if (!config) {
    return new Response(`Turso is not connected yet: ${missingTursoKeys().join(", ")}`, {
      status: 503,
    });
  }

  const url = await getDumpUrl();

  if (!url) return new Response("No data yet");

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.groupToken}`,
      },
    });

    if (response.ok) {
      const text = await response.text();

      return new Response(text);
    }

    return new Response("No data yet");
  } catch {
    console.log("Could not download dump");
    return new Response("Could not download dump", { status: 500 });
  }
}
