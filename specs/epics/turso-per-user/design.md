# turso-per-user — design

## The template

[notrab/turso-per-user-starter](https://github.com/notrab/turso-per-user-starter)
(`590144a`, the template behind Vercel's "Turso Per User Starter") is a
Next.js 14 todo app on Clerk 5 and Turso. A visitor signs up with Clerk; their
database is named after their Clerk user id (`md5`) and created through
Turso's Platform API (`@tursodatabase/api`) as a copy of a seed database, in
the `default` group — by Clerk's `user.created` webhook (`/webhooks/clerk`,
verified with Svix) or, if it has not run, on their first visit
(`/welcome`). The dashboard's server actions add, toggle and remove todos in
that database through drizzle over `@libsql/client`, authenticated with the
group's token; the user menu's "Download my data" streams Turso's SQL dump of
it (`/dump.sql`). The schema is drizzle's (`db/schema.ts`, `migrations/`),
and the README seeds the parent database from `dump.sql`.

## How each Vercel piece maps to Cloudflare

| Vercel | Cloudflare | Notes |
|---|---|---|
| Next.js on Vercel | `@opennextjs/cloudflare` → one Worker + Static Assets | Next 16.3.8, React 19; `next build --webpack`; 1.94 MiB gzipped, inside Workers Free |
| `@libsql/client` (Node entry) | `@libsql/client/web` and `drizzle-orm/libsql/web` | libSQL's HTTP protocol over `fetch`; the Node entry carries a native module |
| `@tursodatabase/api` | the same client, from the Worker | Its calls use the global `fetch`; its `baseUrl` is what the e2e tier points at a stand-in |
| Clerk 5 `middleware.ts` | Clerk 7 `proxy.ts` | Next 16's name; `auth()` and `auth.protect()` are async |
| Project env vars | Orun secrets per environment → the build (Clerk's publishable key) and Worker secrets (the rest) | Below |
| `next/font/google` | `next/font/local` over `@fontsource-variable/inter` | Google Fonts at build time fails on GitHub's runners |
| `app/opengraph-image.png` | the same image in `public/`, named in `metadata` | As a file convention Next compiles the image into the Worker |

## Turso stays a SaaS

The brief keeps Turso's Platform API as the SaaS it is: there is no
D1-per-tenant composition, and the template's point is Turso's
database-per-user model. Each user's database lives in the owner's Turso
organization, created from the owner's seed database; the Worker reaches it
at `libsql://<md5(user id)>-<org>.turso.io` with the group's token, as
upstream (risk TP-F). Nothing is provisioned on Cloudflare but the Worker.

libSQL's client is one of Next's server-external packages, so the build
traces it for Node and copies only `@libsql/isomorphic-ws`'s Node files; the
Worker bundle resolves the package's `workerd` export, so `next.config.ts`
traces that package whole (`outputFileTracingIncludes`).

## The webhook

Upstream parses the body (`req.json()`), re-serialises it and verifies the
signature against that; Svix signs the exact bytes it sent, which a
re-serialisation is not guaranteed to reproduce. Here the raw body is read
once, the signature checked against it first, and only a verified
`user.created` with an id creates anything (`lib/webhook.ts`). Without its
secret the endpoint answers 503 (upstream threw) and users' databases are
created on first visit instead.

## Before Clerk and Turso are connected

No platform brokers Clerk or Turso, so a site is born without them.
Clerk's publishable key is inlined at build, so whether Clerk is connected
is the build's to decide (`lib/clerk.ts`, clerk-auth-starter's switch): with
both keys (the secret key's existence only, `CLERK_SECRET_KEY_SET`) the site
is the template; without them there is no `<ClerkProvider>`, the proxy passes
requests through, and sign-up, sign-in and the dashboard say Clerk is not
connected yet. Turso's four values are read per request (`lib/turso.ts`):
without them the dashboard names what is missing and `/dump.sql` answers
503. The layout that reads them is `force-dynamic`, so no build bakes its
answer in.

The seven keys are optional Orun secrets the component resolves as
`optionalSecretEnv`. The build runs without the Worker's six (`env -u`), so
no bundle and no build cache holds one, and `tooling/wire/worker-secrets.mjs`
hands those that are set to the Worker as Worker secrets (`wrangler secret
bulk`, the values over stdin) from the deploy lane only. `/api/health`
reports which are connected and fails a Clerk-built Worker without
`CLERK_SECRET_KEY`, so the deploy's smoke catches it.

## The repository and the build

notion-waitlist's shape (portfolio-starter-kit's): `apps/web` (the site),
`tests/web` (vitest — the webhook against Svix-signed deliveries, the
Platform API calls against a local stand-in, the todo queries on a real
libSQL file), `tooling/` (TypeScript and ESLint configuration, the rename
engine, the bootstrap helpers, the wrangler renderer, the Worker-secret
push), one `intent.yaml` (dev verify-only, stage and prod deployed),
`ci.yml` the only workflow a site carries, and the baseline's own
`blueprint.yaml`, `repo-blueprint.yaml`, `.baseline/`, `testing/` and
`baseline.yml`. The site's name is one seam (`SITE_NAME` in
`apps/web/app/site.ts`), its origin `NEXT_PUBLIC_SITE_URL` per environment.

## Alternatives rejected

- **D1 per user.** There is no D1-per-tenant composition, and a Worker
  binds a fixed set of databases; the brief keeps Turso.
- **One shared database with a user column.** It is a different template:
  the template exists to show a database per user.
- **Read each user's hostname from the Platform API.** More robust to a
  hostname change, but a Platform API call on every server action;
  upstream derives it, and so does this (risk TP-F).
- **Verify the webhook with Clerk's own `verifyWebhook`.** Equivalent, but
  upstream's dependency is Svix; the change is to verify the raw body, not
  the library.
