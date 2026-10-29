# turso-per-user — for coding agents

Start here before you change this site. This page is short on purpose: the
pages it points at hold the detail, and they are kept true.

## What this is

A todo app with a database per user (the Turso Per User Starter): Clerk
signs users up and in, and each user's todos live in a Turso database of
their own, created through Turso's Platform API from a seed database — by
Clerk's `user.created` webhook, or on their first visit (`/welcome`) — and
reached over libSQL's HTTP protocol (`@libsql/client/web`). Built by
`@opennextjs/cloudflare` into one Cloudflare Worker with Static Assets. Orun
deploys it to `stage` and `prod` on every merge to `main`; `dev` only
verifies. One deployable component (`apps/web`) and its tests (`tests/web`);
no database on Cloudflare. Clerk is connected only when the build had both
its keys (`apps/web/lib/clerk.ts`); Turso only when the Worker holds its four
values (`apps/web/lib/turso.ts`); until then the pages say what to connect.

## Read first, in this order

1. [README.md](README.md) — what is where, how to run it, the live URLs.
2. [ai/context/operations.md](ai/context/operations.md) — the operating
   contract: how a merge deploys, the secrets model, common operations.
3. [ai/context/deployment.md](ai/context/deployment.md) — what is live, as
   last probed.
4. [apps/web/docs/overview.md](apps/web/docs/overview.md) — the component,
   with `architecture.md` and `runbook.md` beside it.
5. [apps/web/app/site.ts](apps/web/app/site.ts) — the site's name and the
   repository its header links to.
6. [apps/web/lib/turso.ts](apps/web/lib/turso.ts) and
   [apps/web/lib/webhook.ts](apps/web/lib/webhook.ts) — the Turso switch,
   the Platform API calls, and the webhook's signature check, and why.

## Working on it

```bash
pnpm install && pnpm typecheck && pnpm lint && pnpm test && pnpm build
pnpm --filter @app/web dev        # http://localhost:3000
```

Local work needs Clerk's keys in `apps/web/.env.local` (from `.env.example`)
to sign anyone in, and Turso's four values to create and use their
databases; without them the pages say what to connect. The landing is
`apps/web/app/page.tsx`, the dashboard `apps/web/app/(authenticated)`, the
queries `apps/web/lib/todos.ts` (unit-tested on a local libSQL file). Every
route that reads a user's database checks Turso is connected first, and the
webhook checks its signature against the raw body before anything else:
keep both true of anything you add.

## How a change lands

- The repository is desired state. `intent.yaml` declares the environments
  and the workspace; `apps/web/component.yaml` declares how the site is
  built, deployed and smoke-tested.
- `orun plan --changed` shows which components and environments a change
  touches. CI runs the same plan on every pull request.
- One task, one pull request to `main`. On the pull request `ci.yml`'s
  verify lanes run (the site built and dry-deployed per environment); they
  do not lint or run the tests, so run `pnpm typecheck && pnpm lint && pnpm
  test` before you push. The merge's `ci.yml` run deploys stage and prod and
  smoke-tests each. That run is the deployment: retry a red lane with
  `gh run rerun --failed`.
- With Orun's work plane: `orun task create --brief "…"` issues a task key,
  `orun pr open --task <KEY>` opens its pull request on `orun/<KEY>-<slug>`,
  and `orun pr land` merges it once its checks pass. Leave the `BASE` prefix
  to the bootstrap: CI checks `orun/BASE-…` branches with `plan` alone.
- A change to `intent.yaml` alone (a `SITE_URL`, say) deploys nothing;
  carry it with a change under `apps/web`.

## Do not touch

- `execution.state.workspace` in `intent.yaml`: every remote operation, and
  CI's OIDC exchange, claims that workspace.
- `ai/context/deployment.md`, and the README between `<!-- 03-docs:begin -->`
  and `<!-- 03-docs:end -->`: rendered from probed URLs, never by hand.
- `.rebrand/values.json`: the identity the site was created with, which the
  deployment record is rendered from.
- Secrets. `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are brokered
  per run from the workspace's Cloudflare connection; `CLERK_PUBLISHABLE_KEY`,
  `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `TURSO_API_TOKEN`, `TURSO_ORG`,
  `TURSO_DATABASE_NAME` and `TURSO_GROUP_AUTH_TOKEN` are the owner's Orun
  secrets per environment. Never put a value in the repository or in GitHub,
  and never inline one into a bundle (only Clerk's publishable key is a
  `NEXT_PUBLIC_` name; no `next.config.ts` `env` entry for the rest): the
  deploy hands them to the Worker as Worker secrets. List them by name
  (operations.md).
- `ci.yml` stays the only workflow that runs on a push to `main`.
- `pnpm-lock.yaml` changes through `pnpm install`, never by hand: CI
  installs with `--frozen-lockfile`.
