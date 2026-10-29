# turso-per-user

A todo app with **a database per user**: everyone who signs up with
[Clerk](https://clerk.com) gets their own [Turso](https://turso.tech)
database, created through Turso's Platform API from a seed database, and
their todos live in it — a Next.js app on **Cloudflare Workers + Static
Assets** through [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare).

Working on it with a coding agent? [AGENTS.md](AGENTS.md) says what to read
first, how a change lands and what not to touch.

## Live deployment

<!-- 03-docs:begin -->
Not recorded yet. The bootstrap's last phase writes the live URLs, the
workspace and the secrets the site uses into
[ai/context/deployment.md](ai/context/deployment.md); how the site deploys
and how to operate it is in
[ai/context/operations.md](ai/context/operations.md).
<!-- 03-docs:end -->

## Connect Clerk

The site deploys and serves before it has a Clerk application: until its
build has Clerk's keys, the landing renders, sign-up, sign-in and the
dashboard say **Clerk is not connected yet**, and `/api/health` reports
`"clerk":"not-connected"`. To sign users in:

1. **Create a Clerk application** in the
   [Clerk dashboard](https://dashboard.clerk.com) and copy its keys
   (API keys → Next.js).
2. **Give the site its keys**, once per deployed environment. They are this
   repository's Orun secrets; stage and prod can each use their own Clerk
   instance:

   ```bash
   orun secrets set CLERK_PUBLISHABLE_KEY --env prod   # prompts for the value
   orun secrets set CLERK_SECRET_KEY      --env prod
   ```

   The publishable key is inlined into the pages by the build, as Clerk
   requires; the secret key never reaches the build — the deploy hands it to
   the Worker as a Worker secret (`wrangler secret bulk`), so it is in no
   bundle, no build cache and no log.
3. **Redeploy the site** (Deploy by hand below): the build is what reads the
   publishable key, and setting a secret deploys nothing.

## Connect Turso

Each user's database lives in your Turso organization. Until the Worker has
Turso's four values, a signed-in user's dashboard says **Turso is not
connected yet**, naming what it lacks, and `/api/health` reports
`"turso":"not-connected"`. With the [Turso CLI](https://docs.turso.tech/cli/installation):

1. **The seed database** every user's database is copied from:

   ```bash
   turso db create <seed-database-name>
   turso db shell <seed-database-name> < apps/web/dump.sql
   ```

   (or apply `apps/web/migrations` to it with `pnpm --filter @app/web db:migrate`
   and the values below in your shell).
2. **A group token** (reads and writes every database in the `default`
   group) and **a Platform API token** (creates the databases):

   ```bash
   turso group tokens create default
   turso auth api-tokens mint <name>
   ```
3. **Give the site the four values**, once per deployed environment:

   ```bash
   orun secrets set TURSO_API_TOKEN        --env prod   # the Platform API token
   orun secrets set TURSO_ORG              --env prod   # your user or organization name
   orun secrets set TURSO_DATABASE_NAME    --env prod   # the seed database
   orun secrets set TURSO_GROUP_AUTH_TOKEN --env prod   # the group token
   ```
4. **Redeploy the site**: the deploy hands them to the Worker as Worker
   secrets, and the Worker reads them per request. From then on a user's
   first visit to the dashboard creates their database.

## The webhook

Optional. With Clerk's `user.created` webhook, a new user's database is
created in the background when they sign up, so their first visit does not
wait for it. In the Clerk dashboard (Webhooks → Add endpoint), point it at
`https://<your-site>/webhooks/clerk`, subscribe it to `user.created`, copy
its signing secret, store it and redeploy:

```bash
orun secrets set CLERK_WEBHOOK_SECRET --env prod
```

Every delivery's Svix signature is checked against the exact body sent,
before anything else; a forged, altered or stale one is refused (400). Until
the secret is stored the endpoint answers 503, and databases are created on
first visit instead.

## Change the schema

`apps/web/db/schema.ts` is the schema; `pnpm --filter @app/web db:generate`
writes a migration to `apps/web/migrations`, and `pnpm --filter @app/web
db:migrate` applies it to the **seed** database (with `TURSO_ORG`,
`TURSO_DATABASE_NAME` and `TURSO_GROUP_AUTH_TOKEN` in your shell). Databases
created after that start with the new schema; a user's database created
before it does not change — apply the migration to each of those as well
(`turso db shell <name>`), or Turso's multi-database schemas.

## What is here

| Surface | Where |
|---|---|
| The site's name and source link | `apps/web/app/site.ts` |
| The landing, sign-up and sign-in | `apps/web/app/page.tsx`, `apps/web/app/(unauthenticated)` |
| The dashboard and its server actions | `apps/web/app/(authenticated)` |
| `/welcome`, `/dump.sql` ("Download my data"), `/webhooks/clerk`, `/api/health` (the deploy's smoke) | `apps/web/app` |
| Whether Clerk and Turso are connected, the Platform API calls, the user's database, the todo queries, the webhook | `apps/web/lib` |
| The schema | `apps/web/db/schema.ts`, `apps/web/migrations`, `apps/web/dump.sql` |
| The Worker-secret push | `tooling/wire/worker-secrets.mjs` |
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

```bash
pnpm --filter @app/web dev        # http://localhost:3000
pnpm --filter @app/web preview    # wrangler dev over the built Worker
```

Variables (`apps/web/.env.example`; `apps/web/.env.local` for `dev`,
`apps/web/.dev.vars` for `preview` — neither is ever committed):

| Variable | What it does |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk's keys (above). Both, or the site builds without Clerk. |
| `CLERK_WEBHOOK_SECRET` | The webhook's signing secret (above). Read by the Worker per request. |
| `TURSO_API_TOKEN`, `TURSO_ORG`, `TURSO_DATABASE_NAME`, `TURSO_GROUP_AUTH_TOKEN` | Turso (above). Read by the Worker per request. |
| `NEXT_PUBLIC_SITE_URL` | The site's public origin, for the Open Graph image's absolute URL. The deploy sets it per environment (see below). Defaults to `http://localhost:3000`. |

## How it deploys

Merges to `main` converge through [Orun](https://github.com/sourceplane/orun):
`.github/workflows/ci.yml` plans the changed components and runs each lane
against the workspace in `intent.yaml`. The site deploys to `stage`, then to
`prod` once stage has converged on the same commit; `dev` only verifies. The
Worker is `turso-per-user-web-<env>` on your account's workers.dev
subdomain, and every deploy is smoke-tested over HTTP: the landing renders
to its end, and `/api/health` answers ok — the Worker holds Clerk's secret
key whenever its build has Clerk. A pull request runs the same pipeline's
verify lanes: the site built and dry-deployed for each environment, with
nothing deployed. They do not lint or run the tests, so run `pnpm typecheck`,
`pnpm lint` and `pnpm test` before you push. (A push to `main` builds,
deploys and smoke-tests.)

The pipeline holds one credential, GitHub's own `GITHUB_TOKEN`. The
Cloudflare token and account id are brokered per run from the workspace's
Cloudflare connection, and Clerk's and Turso's keys are Orun secrets;
nothing provider-shaped is stored in the repository or in GitHub.

**Deploy by hand.** Orunbase's **Deploy** button on a component, or **Run
workflow** on the CI workflow in GitHub's Actions tab (on `main`), runs
`ci.yml` for the environment and components you pick, and each one deploys
exactly as a merge would deploy it. Leave the component blank to redeploy
every component in that environment, with nothing changed: after storing or
rotating Clerk's or Turso's keys, say. A component with nothing to run in
that environment (a test suite in `prod`) is left out with a notice.

## Custom domain

The site answers on workers.dev from its first deploy. To serve it on your
own domain:

1. Add the domain to the Cloudflare account the site deploys into, and attach
   it to the Worker (dashboard → Workers & Pages →
   `turso-per-user-web-prod` → Settings → Domains & Routes → Add →
   Custom domain). Do the same for stage with a subdomain if you want one.
   Add the domain to your Clerk application as well (Clerk dashboard →
   Domains): a production Clerk instance signs users in on its own domain.
2. Set the environment's public origin in `intent.yaml`, so the Open Graph
   image's URL uses it (until then it uses the workers.dev URL):

   ```yaml
   environments:
     prod:
       env:
         SITE_URL: https://turso-per-user.example.com
   ```

   The site was born with the reserved placeholder
   `turso-per-user.example.com` where its domain goes: that example,
   and `BASE_DOMAIN` under each environment (dev, stage and prod) in
   `intent.yaml`. Replace it with your domain in the same change.
3. Merge. The next deploy of `apps/web` builds with the new origin. (A change
   to `intent.yaml` alone deploys nothing — touch `apps/web` in the same pull
   request, or let the next change to the site carry it.)

## Credits

The site is the Turso Per User Starter
([notrab/turso-per-user-starter](https://github.com/notrab/turso-per-user-starter)),
the template behind Vercel's Turso Per User Starter (demo at
https://turso-per-user-starter.vercel.app). It carries no licence: no
LICENSE file, no `license` in its `package.json`, and GitHub records none.
