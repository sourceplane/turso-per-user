# turso-per-user — implementation plan

Three milestones, each one reviewed pull request (TP0 is the repository's
first commit), each green before it merges.

## TP0 — the spec (TP-1)

The repository is born: `intent.yaml` with the placeholder workspace
`ws_CHANGE_ME`, `ci.yml` (turso-starter's, which plans nothing until the
workspace is set), the shared TypeScript and ESLint configuration, the spec
index, this doc set and the task contracts.

## TP1 — a database per user on Workers (TP-2)

- The template's `app/`, `db/`, `migrations/`, `dump.sql`, Tailwind
  configuration and favicons in `apps/web`; its dependencies on Next 16.3.8,
  React 19 and Clerk 7, with `@opennextjs/cloudflare` and `wrangler`; Inter
  self-hosted.
- `next.config.ts` (`output: 'standalone'`, the workspace root, images
  unoptimized, the Clerk switch, `@libsql/isomorphic-ws` traced whole),
  `open-next.config.ts` with the static-assets incremental cache,
  `wrangler.jsonc`, and the build on webpack.
- `lib/clerk.ts`, `lib/turso.ts` (the Turso switch, the Platform API calls),
  `lib/db.ts` (the user's database over `@libsql/client/web`),
  `lib/todos.ts` (the queries), `lib/webhook.ts` (the raw-body signature
  check); `proxy.ts`; the pages and routes reading them; the not-connected
  notices; `/api/health`.
- `SITE_NAME`, `SOURCE_URL` and `SITE_URL` in `app/site.ts`; the landing,
  the metadata and the user menu read them.
- `tooling/wire/worker-secrets.mjs`; `component.yaml`: the optional secret
  refs, the deploy contract (the origin per environment, the build without
  the Worker's keys, the secret push) and its smoke. `tests/web`: the
  identity and the Clerk switch, Turso's connection and the Platform API
  calls, the webhook, the todo queries, the secret push.
- The README's "How it maps to Vercel".

## TP2 — a baseline (TP-3)

notion-waitlist's machinery, renamed: `blueprint.yaml`,
`repo-blueprint.yaml`, `.baseline/` (identity, the product's README with
"Connect Clerk", "Connect Turso", "The webhook" and "Change the schema", its
`AGENTS.md`, task contracts), `tooling/rebrand` (the template's repository
and demo masked as credit), `tooling/bootstrap`,
`hooks/render-deployment-docs.sh` (probing `/` and `/api/health`, naming the
seven keys), `docs/phases/`, the context pack, `testing/` (the leak and
placement gates on this tree's files, the optional refs checked in the plan;
the e2e tier building and serving the site not connected, then with
made-up keys against a local stand-in of Turso's Platform API — a Svix-signed
webhook creating the user's database, forged, stale and re-serialised ones
refused — then without Clerk's secret key) and `baseline.yml` / `tag.yml`.
