# turso-per-user

The [Turso Per User Starter](https://github.com/notrab/turso-per-user-starter)
([notrab/turso-per-user-starter](https://github.com/notrab/turso-per-user-starter),
Vercel's "Turso Per User Starter" template, demo at
https://turso-per-user-starter.vercel.app) — a Next.js todo app where every
user who signs up with Clerk gets a database of their own, created through
Turso's Platform API — running on **Cloudflare Workers + Static Assets**
through [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare), deployed by
[Orun](https://github.com/sourceplane/orun) to stage and prod on every merge.
Packaging it as an Orun baseline is the next milestone (TP2).

The template's code is the code. What the port adds is the Workers build,
the monorepo wrapper, a test package and the deploy contract; what it
changes is what Workers and a fresh, unattended deployment force. Turso
stays the SaaS it is upstream — each user's database is created in the
owner's Turso organization by its Platform API and reached over libSQL's
HTTP protocol (`@libsql/client/web`, the client that runs on Workers); there
is no database on Cloudflare. Clerk's and Turso's keys are Orun secrets the
owner stores after the build, handed to the Worker as Worker secrets; until
they are, the site says what to connect instead of failing. Clerk's webhook
is checked against the raw body it was signed over, and answers 503 until
its secret is stored. Inter is self-hosted, and the template's GitHub links
are the site's own source. See
[`specs/epics/turso-per-user`](specs/epics/turso-per-user/README.md) for the
design, the milestones and the as-built status, including every departure.

## What is here (the site)

| Surface | Where |
|---|---|
| The site's name, source link and origin | `apps/web/app/site.ts` |
| The landing, sign-up and sign-in (Clerk) | `apps/web/app/page.tsx`, `apps/web/app/(unauthenticated)` |
| The dashboard: the user's todos, in the user's own database (server actions) | `apps/web/app/(authenticated)` |
| `/welcome` (the user's database created on first visit), `/dump.sql` (downloaded), `/webhooks/clerk`, `/api/health` (the deploy's smoke) | `apps/web/app/welcome`, `apps/web/app/(authenticated)/dump.sql`, `apps/web/app/webhooks/clerk`, `apps/web/app/api/health` |
| Whether Clerk and Turso are connected; the Platform API calls; the user's database | `apps/web/lib/clerk.ts`, `apps/web/lib/turso.ts`, `apps/web/lib/db.ts` |
| The todo queries, and the webhook (signature first) | `apps/web/lib/todos.ts`, `apps/web/lib/webhook.ts` |
| The schema every user's database is seeded with | `apps/web/db/schema.ts`, `apps/web/migrations`, `apps/web/dump.sql` |
| The Worker-secret push (Clerk's secret key, the webhook's secret, Turso's four values) | `tooling/wire/worker-secrets.mjs` |
| Workers build and deploy contract | `apps/web/next.config.ts`, `open-next.config.ts`, `wrangler.jsonc`, `component.yaml` |
| Tests | `tests/web` (vitest) |

## Getting started

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build            # next build + opennextjs-cloudflare build → apps/web/.open-next
```

The build needs no Turso value, and of Clerk only its publishable key (and
the knowledge that a secret key exists): without both of Clerk's keys it
builds the "connect Clerk" site. With the keys in `apps/web/.env.local`
(`apps/web/.env.example`), `pnpm --filter @app/web dev` signs users up and
creates their databases; `pnpm --filter @app/web preview` serves the built
Worker with the same keys from `apps/web/.dev.vars`.

## How it maps to Vercel

| Vercel | Here |
|---|---|
| Next.js 14 hosting on Vercel's runtime | Next.js 16.3.8 in one Cloudflare Worker (`.open-next/worker.js`) + Static Assets, built by `next build --webpack` and OpenNext |
| `@libsql/client` (its Node entry) | `@libsql/client/web`: libSQL's HTTP protocol over `fetch`, no native module — each user's Turso database, as upstream |
| Turso's Platform API (`@tursodatabase/api`) | The same client and calls (create from the seed database in the `default` group; look up), from the Worker |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `TURSO_*` as project env vars | Orun secrets per environment the owner stores, read by the build as optional refs; the publishable key is inlined at build, the rest handed to the Worker as Worker secrets — no bundle holds one |
| Missing keys (Clerk's middleware throws; the Platform API client throws on import) | The not-connected site: the landing renders, sign-in and the dashboard say what to connect, the webhook answers 503 — never a 500 |
| `middleware.ts` (`clerkMiddleware()`) | `proxy.ts` (Next 16's name), `clerkMiddleware()` once Clerk is connected |
| The webhook verified a re-serialised `req.json()` | Verified against the raw body Svix signed, before it is parsed |
| `next/font/google` (Inter) | Inter self-hosted from `@fontsource-variable/inter` (OFL-1.1) |
| `app/opengraph-image.png` | The same image served from `public/` and named in `metadata` on `metadataBase` |
| The landing's "GitHub Repo" and the user menu's "Star repository" (the template's repository) | The site's own source link |
| Deploy on push | Orun deploys `<repo>-web-{stage,prod}` on merge to `main` (`apps/web/component.yaml`), smoke-tested |

## Licence

The template carries no licence: no LICENSE file, no `license` in its
`package.json`, no licence section in its README, and GitHub records none.
This repository keeps the template's credit (the links above).

## CI

| Workflow | What it runs | Ships to a site |
|---|---|---|
| `ci.yml` | the Orun pipeline, and the only workflow a site carries: `orun plan --changed`, then one job per lane. A pull request runs the verify lanes (the site built and dry-deployed per environment; the tests' `quick-check` lane installs and checks the package, it does not run them), except the bootstrap's own landings (`orun/BASE-*`), where `plan` alone is the check; a merge deploys stage → prod. It plans nothing while `intent.yaml` names the placeholder workspace `ws_CHANGE_ME`, as this repository does. A manual run (Orunbase's Deploy button, or Run workflow on `main`) plans the environment and components it names under the push-to-main trigger, so they deploy as a merge deploys them | yes |
