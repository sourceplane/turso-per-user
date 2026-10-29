# turso-per-user — decisions

The choices that shape this repository, one line each, with where the full
reasoning lives. Superseded decisions stay listed, marked, so the history
reads in order.

| # | Decision | Why | Source |
|---|---|---|---|
| 1 | Next.js on Workers + Static Assets through `@opennextjs/cloudflare`, with the static-assets incremental cache | Every page reads the visitor's session or the Worker's secrets per request; nothing is cached for a later visitor | `specs/epics/turso-per-user/design.md` |
| 2 | Next 16.3.8 and React 19, not the template's Next 14 | OpenNext 1.20 refuses Next 15.5 at build; every OpenNext starter here is proven on 16.3.8 | risk TP-D |
| 3 | Turso stays the SaaS it is: each user's database is created in the owner's Turso organization by its Platform API, from a seed database, in the `default` group | There is no D1-per-tenant composition, and the template is about Turso's database-per-user model | `apps/web/lib/turso.ts` |
| 4 | `@libsql/client/web` (libSQL's HTTP protocol over `fetch`) and `drizzle-orm/libsql/web` | The Node entry carries a native module; the web client is the one that runs on Workers | `apps/web/lib/db.ts` |
| 5 | `@libsql/isomorphic-ws` traced whole (`outputFileTracingIncludes`) | libSQL's client is a Next server-external package, traced for Node; the Worker bundle resolves its `workerd` export, which the trace left out | `apps/web/next.config.ts` |
| 6 | Clerk is connected when the build had both its keys (`CLERK_CONNECTED`, from `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY_SET`); not connected, the provider and the proxy's middleware are left out and the pages say what to connect | Clerk's provider and middleware throw without keys; the publishable key is inlined at build, so the decision is the build's | `apps/web/lib/clerk.ts`, `apps/web/next.config.ts` |
| 7 | Turso's four values and the webhook's secret are read per request; without them the dashboard says what is missing, `/dump.sql` and the webhook answer 503 | A fresh site must deploy and serve before its owner has either; upstream's Platform API client threw on import without a token | `apps/web/lib/turso.ts`, `apps/web/lib/webhook.ts` |
| 8 | The authenticated layout is `force-dynamic` | A layout that reads only the Worker's secrets would be prerendered at build with whatever the build saw | `apps/web/app/(authenticated)/layout.tsx` |
| 9 | The webhook verifies the raw body Svix signed, before parsing it | Upstream verified `JSON.stringify(await req.json())`, which is not guaranteed to be the bytes signed | `apps/web/lib/webhook.ts` |
| 10 | The keys are Orun secrets per environment, read as `optionalSecretEnv`; the build runs without the Worker's six (`env -u`), told of Clerk's secret key only that it exists, and the deploy lane hands them to the Worker as Worker secrets | SaaS keys are Orun secrets; none but Clerk's publishable key may be in a bundle or the build cache | `apps/web/component.yaml`, `tooling/wire/worker-secrets.mjs` |
| 11 | `/api/health` and a full-page render are the deploy's smoke; health fails a Clerk-built Worker without `CLERK_SECRET_KEY` | A Worker that lost its secret fails every signed-in request; the smoke catches it at deploy | `apps/web/component.yaml` |
| 12 | The landing's "GitHub Repo" and the user menu's "Star repository" are the site's own source link | The site deploys from its own repository | IMPLEMENTATION-STATUS (departures) |
| 13 | The site's name is one seam, `SITE_NAME` in `apps/web/app/site.ts`, for the heading, the title and `og:site_name`; `metadataBase` is `NEXT_PUBLIC_SITE_URL` | The rename rewrites one literal | `apps/web/app/site.ts` |
| 14 | No custom-domain phase: a domain is the owner's step, and `SITE_URL` points the build at it | The brokered `workers-deploy` token has no zone scope | README, "Custom domain" |
| 15 | One landing (`01-product`) then the record (`03-docs`), each checked in the build box | A landing has a fixed cost; the convergence on main builds, deploys and smoke-tests the site for real | `docs/phases/README.md` |
| 16 | `ci.yml` plans nothing while `intent.yaml` names `ws_CHANGE_ME`; no Checks workflow | A bootstrap cannot set a repository variable; a push to main must start `ci.yml` alone | `.github/workflows/ci.yml` |
| 17 | stack-tectonic 0.19.0, not 0.20.0 | 0.20.0's lane-shared install links `node_modules` out of the job's tree | portfolio-starter-kit's risk PK-J |
| 18 | Component docs are generated from the manifests and checked in CI; orun is pinned only where it runs | A hand-written copy drifts silently | `tooling/catalog/gen-component-docs.py` |
| 19 | `subdomain` is read from the Cloudflare connection, never asked; the console asks for no domain and no Clerk or Turso key | The first two belong to the account or the owner; no platform connection can mint the keys | `blueprint.yaml` |
| 20 | Task prefix TP, not TU | turso-starter's tasks are TU-n | `specs/epics/turso-per-user/epic.yaml` |
