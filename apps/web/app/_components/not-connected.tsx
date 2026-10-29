import { CLERK_DASHBOARD_URL } from "@/lib/clerk";

// What stands where the template's Clerk sign-in, or its todo list, would be
// until the owner connects them (README → Connect Clerk, Connect Turso).
// Names only, never a value.

function Notice({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div
      data-connect={id}
      className="max-w-lg mx-auto p-8 rounded border border-white/5 bg-white/5 text-white"
    >
      <h1 className="text-2xl font-black tracking-tight">{title}</h1>
      <div className="mt-3 text-white/60 space-y-3">{children}</div>
    </div>
  );
}

export function ConnectClerk() {
  return (
    <Notice id="clerk" title="Clerk is not connected yet">
      <p>
        Sign-up, sign-in and each user&apos;s own database run on a Clerk application. Create one in
        the{" "}
        <a href={CLERK_DASHBOARD_URL} target="_blank" className="underline text-aquamarine">
          Clerk dashboard
        </a>
        , store its publishable key and secret key as this environment&apos;s{" "}
        <code>CLERK_PUBLISHABLE_KEY</code> and <code>CLERK_SECRET_KEY</code>, and redeploy.
      </p>
      <p>The README&apos;s &ldquo;Connect Clerk&rdquo; says how.</p>
    </Notice>
  );
}

export function ConnectTurso({ missing }: { missing: string[] }) {
  return (
    <Notice id="turso" title="Turso is not connected yet">
      <p>
        Every user gets a database of their own in a Turso organization. Store this
        environment&apos;s{" "}
        {missing.map((key, i) => (
          <span key={key}>
            {i > 0 ? (i === missing.length - 1 ? " and " : ", ") : null}
            <code>{key}</code>
          </span>
        ))}{" "}
        and reload: the site reads them on every request.
      </p>
      <p>The README&apos;s &ldquo;Connect Turso&rdquo; says how.</p>
    </Notice>
  );
}
