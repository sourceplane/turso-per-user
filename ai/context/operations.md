# turso-per-user — operating contract (for humans and agents)

This is the standing guide to how this site is deployed and operated.
Instance facts (live URLs, workspace, the secrets it uses) live in
[deployment.md](deployment.md), rendered from probed reality by the
bootstrap's `03-docs` phase; this file is the contract that stays true
between deployments. It is written to give an agent with repository read
access enough context to reason about and operate the site without any
other source.

## What this system is

A todo app with a database per user on Cloudflare (the Turso Per User
Starter), expressed as an Orun component-native desired-state repo. Clerk
and Turso are SaaS the site calls, not components here: its owner creates
the Clerk application and the Turso organization, seed database and tokens,
and stores their keys.

- **`apps/web`** — the site: Next.js built by `@opennextjs/cloudflare`
  (`next build --webpack`) into one Worker plus Static Assets. Clerk signs
  users up and in (`proxy.ts` runs Clerk's middleware); the dashboard reads
  and writes the signed-in user's todos in their own Turso database
  (`@libsql/client/web` over HTTP, with the group's token); `/welcome`
  creates that database on a user's first visit, and Clerk's
  `user.created` webhook (`/webhooks/clerk`) creates it in the background;
  `/dump.sql` downloads it; `/api/health` is what the deploy's smoke reads.
  There is no database on Cloudflare.
- **The Clerk and Turso switches** — `apps/web/lib/clerk.ts` (decided by the
  build: both of Clerk's keys, or the "connect Clerk" pages) and
  `apps/web/lib/turso.ts` (decided per request: Turso's four values, or the
  dashboard names what is missing and `/dump.sql` answers 503).
- **The webhook** — `apps/web/lib/webhook.ts`: Svix's signature checked
  against the raw body before anything else; only `user.created` creates a
  database; 503 until `CLERK_WEBHOOK_SECRET` is stored.
- **`tests/web`** — the site's identity and the Clerk switch, Turso's
  connection and its Platform API calls (a local stand-in), the webhook's
  signature check, the todo queries on a real libSQL file, and the
  Worker-secret push (vitest), verified on the `dev` rung.
- **`tooling/*`** — shared TypeScript and ESLint configuration, the
  deploy-time wrangler renderer, and `wire/worker-secrets.mjs`, which hands
  Clerk's secret key, the webhook's secret and Turso's values to the Worker.

Environments: **`stage`** and **`prod`** are deployed; **`dev` is
verify-only by design** — lanes build and test, nothing deploys.

## Identity and tenancy

Every remote operation runs against ONE Orun workspace, declared in
`intent.yaml` under `execution.state.workspace` — committed, enforced, and
what CI uses. Do not remove it; headless credentials depend on it. If it
reads `ws_SET_ME`, the bootstrap had no workspace to write: set the real one
before anything else.

## How deployment works

1. Merge (or push) to `main`.
2. CI (`.github/workflows/ci.yml`) runs `orun plan --changed` — only
   components whose files changed are planned — then runs each planned lane
   with `orun run --remote-state`, authenticated by GitHub OIDC (the
   exchange resolves this repository's linked workspace server-side).
3. `apps/web` builds once per environment, with `NEXT_PUBLIC_SITE_URL` set to
   that environment's `SITE_URL` (intent.yaml) or its workers.dev URL, and
   without the Worker's keys (told of Clerk's secret key only that it
   exists, which decides whether Clerk is connected; Clerk's publishable key
   is inlined); the deploy lane then sets the keys the environment has on
   `turso-per-user-web-<env>` as Worker secrets (`wrangler secret bulk`),
   `wrangler deploy` ships it, and a smoke test fetches `/` (rendered to its
   end) and `/api/health` (ok: the Worker holds Clerk's secret key whenever
   its build has Clerk).
4. `prod` deploys after `stage` has converged on the same commit
   (`environments.prod.promotion` in intent.yaml).
5. **The convergence run is the deployment.** A green run means every
   planned lane applied. Failed lanes are retried with
   `gh run rerun --failed`, which resumes the same execution.

Caveats that matter:

- A push that touches no component files plans zero lanes — that run is
  green and deployed nothing. Never treat "latest run green" as "site
  converged"; probe the URLs instead.
- A change to `intent.yaml`'s `environments` (a new `SITE_URL`, say) maps to
  no component and redeploys nothing on its own. Land it with a change under
  `apps/web`.
- Storing or rotating a Clerk or Turso key deploys nothing either: the
  deploy is what hands the keys to the Worker (and the build is what reads
  Clerk's publishable key). Redeploy by hand after setting them.
- A schema change reaches the seed database only (`pnpm --filter @app/web
  db:migrate`): databases created before it keep the old schema until it is
  applied to each.

## Secrets model

- **Brokered provider secrets**: `CLOUDFLARE_API_TOKEN` (Workers deploy
  scope) and `CLOUDFLARE_ACCOUNT_ID` — pointers minted per run from the
  workspace's Cloudflare connection. No long-lived values at rest; nothing
  to rotate by hand.
- **The owner's Clerk and Turso keys**, per environment, OPTIONAL:
  `CLERK_PUBLISHABLE_KEY` (read by the build as
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and inlined, as Clerk requires),
  `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` (the `user.created` webhook's
  signing secret), and Turso's `TURSO_API_TOKEN` (Platform API),
  `TURSO_ORG`, `TURSO_DATABASE_NAME` (the seed database) and
  `TURSO_GROUP_AUTH_TOKEN` (the group's database token). The build runs
  without the last six (`env -u`), so no bundle or build cache holds one;
  the deploy lane hands them to the Worker as Worker secrets, the values
  over stdin, and the Worker reads them per request.
  `apps/web/component.yaml` reads all seven as `optionalSecretEnv`: a key
  nobody stored is skipped, and the site deploys not connected. Rotate one
  at Clerk or Turso, store the new value (`orun secrets set … --env <env>`),
  redeploy.
- Inspect by NAME only: `orun secrets list --org <ws> --project` and
  `--env stage|prod`. No tooling in this repository prints a secret value,
  and no document in `ai/context/` may contain one. `/api/health` reports
  whether Clerk, Turso and the webhook are connected, never a value.

## Verifying the system

```bash
# the site on each environment (also recorded, probed, in deployment.md)
curl -s -o /dev/null -w '%{http_code}\n' https://turso-per-user-web-stage.your-workers-subdomain.workers.dev/
curl -s https://turso-per-user-web-prod.your-workers-subdomain.workers.dev/api/health   # {"ok":true,"clerk":…,"turso":…,"webhook":…}

# workspace readiness (integrations + repository link)
orun integrations list --org <ws> --json && orun cloud check --org <ws>
```

## Common operations

| task | how |
|---|---|
| connect Clerk | a Clerk application; `orun secrets set CLERK_PUBLISHABLE_KEY --env <env>` and `CLERK_SECRET_KEY`, deploy by hand (README, "Connect Clerk") |
| connect Turso | a seed database (`apps/web/dump.sql`), a group token and a Platform API token; `orun secrets set TURSO_API_TOKEN --env <env>` (and `TURSO_ORG`, `TURSO_DATABASE_NAME`, `TURSO_GROUP_AUTH_TOKEN`), deploy by hand (README, "Connect Turso") |
| create databases in the background | Clerk's `user.created` webhook at `<site>/webhooks/clerk`; `orun secrets set CLERK_WEBHOOK_SECRET --env <env>`, deploy by hand (README, "The webhook") |
| change the schema | `apps/web/db/schema.ts`, `pnpm --filter @app/web db:generate`, then `db:migrate` against the seed database (README, "Change the schema") |
| change the site's code | `apps/web/app/`, `apps/web/lib/`, its name `apps/web/app/site.ts`; merge |
| deploy a change | merge to `main`; watch the run; failed lanes → `gh run rerun --failed` |
| deploy by hand | Orunbase's Deploy button, or `gh workflow run ci.yml --ref main -f environment=<env> [-f component=<a,b>]` — the named components (blank: every one) run in that environment as a merge runs them; started off `main` it is refused |
| redeploy without a change | edit the last line of `apps/web/component.yaml` (`# orun: redeploy <reason> <stamp>`) and merge — it is a deploy trigger, nothing reads it |
| serve a custom domain | attach it to the Worker in Cloudflare, set `SITE_URL` for the environment in `intent.yaml`, and replace the placeholder `turso-per-user.example.com` in `intent.yaml`'s `BASE_DOMAIN` (dev, stage and prod) with it (README, "Custom domain") |
| add a runtime secret | `orun secrets set <KEY> --org <ws> --env <env>`, then an `optionalSecretEnv` entry in `apps/web/component.yaml` and a `--secret <KEY>` on its `worker-secrets.mjs` call |
| headless credentials | `ORUN_TOKEN` (workspace-scoped) + `GITHUB_TOKEN` |

The deployment record is the bootstrap's `03-docs` phase. Re-running it (the
Orun console's Retry on that phase, or `orun new … --phase 03-docs`)
re-probes the URLs and re-renders [deployment.md](deployment.md); it is
idempotent.

## Evolution

Each user's data is in their own Turso database; data shared across users
(a team, say) needs a database of its own beside them. Structural
changes (a second Worker, an API, a data store) follow the same
contract that deployed the site: add a component under `apps/`, `infra/` or
`packages/` with a `component.yaml`, land it as a pull request, and the
convergence run applies it.
