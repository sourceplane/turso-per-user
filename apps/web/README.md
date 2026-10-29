# apps/web — the site

The Turso Per User Starter
([notrab/turso-per-user-starter](https://github.com/notrab/turso-per-user-starter)),
running on Cloudflare Workers + Static Assets:

- The landing, and Clerk's sign-up and sign-in (`app/page.tsx`,
  `app/(unauthenticated)`, `proxy.ts`)
- The dashboard: the signed-in user's todos, read and written by server
  actions in the user's own Turso database (`app/(authenticated)`,
  `lib/db.ts`, `lib/todos.ts`)
- The user's database created through Turso's Platform API — by Clerk's
  `user.created` webhook (`app/webhooks/clerk`, `lib/webhook.ts`) or on their
  first visit (`app/welcome`) — from the seed database (`lib/turso.ts`); the
  schema is `db/schema.ts`, `migrations/`, `dump.sql`
- `/dump.sql` downloads the user's database; `/api/health` is the deploy's
  smoke
- Tailwind 3, Inter self-hosted

Clerk is connected when the build had both its keys (`lib/clerk.ts`); Turso
when the Worker holds its four values (`lib/turso.ts`); until then the pages
say what to connect. The site's name and the repository its landing links to
are in `app/site.ts`.

```bash
cp .env.example .env.local   # and fill in the keys
pnpm dev        # next dev on http://localhost:3000
pnpm build      # next build --webpack + opennextjs-cloudflare build → .open-next/
pnpm preview    # wrangler dev over the built Worker (the keys from .dev.vars)
```

How it is deployed — per environment, on merge to `main` — is the
repository's README and `component.yaml` beside this file.
