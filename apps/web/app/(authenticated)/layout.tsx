import { redirect } from "next/navigation";

import { ConnectClerk, ConnectTurso } from "@/app/_components/not-connected";
import { clerkConnected } from "@/lib/clerk";
import { currentDatabaseName } from "@/lib/db";
import { databaseExists, missingTursoKeys, tursoConfig } from "@/lib/turso";
import { Header } from "./header";

// Per request, always: whether Turso is connected is the Worker's to say at
// request time (its secrets), never the build's — prerendered, the page
// would keep whatever the build saw.
export const dynamic = "force-dynamic";

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Not connected yet: the notice, where the template's dashboard would be.
  if (!clerkConnected) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24">
        <ConnectClerk />
      </div>
    );
  }
  const config = tursoConfig();
  if (!config) {
    return (
      <>
        <Header />
        <div className="max-w-2xl mx-auto px-6 py-12">
          <ConnectTurso missing={missingTursoKeys()} />
        </div>
      </>
    );
  }

  const name = await currentDatabaseName();
  const exists = name ? await databaseExists(config, name) : false;

  if (!exists) redirect("/welcome");

  return (
    <>
      <Header />
      <div className="max-w-2xl mx-auto px-6 py-12">{children}</div>
    </>
  );
}
