# turso-per-user — implementation status

| Milestone | State | Landed |
|---|---|---|
| TP0 — the spec | ✅ | the repository's first commit |
| TP1 — a database per user on Workers | ✅ | TP-2 |
| TP2 — a baseline | ✅ | TP-3, tagged `baseline-v1` |

## Departures from the upstream template

Everything not listed here is the template as it is upstream at `590144a`.

| # | Departure | Why |
|---|---|---|
| 1 | Next 14 → 16.3.8, React 18 → 19, Clerk 5 → 7 (`auth()` awaited, `auth.protect()`), `middleware.ts` → `proxy.ts` | OpenNext 1.20 refuses Next 15.5; Next 16 renamed middleware |
| 2 | `next build --webpack` | The build every OpenNext starter here is proven on; the Worker is 1.94 MiB gzipped |
| 3 | `@libsql/client` → `@libsql/client/web` (0.14 → 0.18), drizzle 0.35 → 0.45 through `drizzle-orm/libsql/web`; `@tursodatabase/api` 1.8 → 1.9, svix kept on 1.x | The Node entry carries a native module; the web client runs on Workers |
| 4 | `@libsql/isomorphic-ws` traced whole | The build traces libSQL for Node; the Worker resolves its `workerd` export |
| 5 | `app/utils.ts` split into `lib/turso.ts` (config, Platform API), `lib/db.ts` (the user's database), `lib/todos.ts` (the queries) | Each is read per request with the Worker's secrets, and the queries are unit-tested on a real libSQL file |
| 6 | The webhook verifies the raw body, before parsing it; 503 without its secret (upstream threw) | Svix signs the bytes it sent |
| 7 | Not connected: no `<ClerkProvider>`, a pass-through proxy and a "connect Clerk" notice on sign-up, sign-in and the dashboard; without Turso's values the dashboard names what is missing, `/dump.sql` and the webhook answer 503, `/welcome` sends the visitor on | A fresh site deploys before its owner has either; upstream threw on import |
| 8 | The authenticated layout is `force-dynamic` | It reads the Worker's secrets; prerendered, it would keep the build's answer |
| 9 | `/api/health` | The deploy's smoke |
| 10 | The seven keys are optional Orun secrets; the build runs without the Worker's six, which reach the Worker as Worker secrets | SaaS keys are Orun secrets, never in a bundle |
| 11 | `TURSO_API_BASE_URL` (unset in a deployment) | The e2e tier points the Platform API client at a stand-in |
| 12 | Inter self-hosted (`@fontsource-variable/inter`) | next/font/google fails on GitHub's runners |
| 13 | `app/opengraph-image.png` → `public/`, named in `metadata` on `metadataBase`; `favicon-16x16.png`/`favicon-32x32.png` moved to `public/`; `turso.svg` (unused) dropped | A file convention compiles the image into the Worker |
| 14 | The site's name (`SITE_NAME`) heads the landing and titles it; the landing's "GitHub Repo" and the user menu's "Star repository" link the site's own source | The rename rewrites one seam; the site deploys from its own repository |
| 15 | The Turso mark is one component (`app/_components/turso-logo.tsx`), drawn where upstream drew it | It was written out twice |
| 16 | `drizzle.config.ts` reads its values from the shell, without `@next/env` | `envConfig.ts` only loaded `.env`; `pnpm db:migrate` with the values in the environment does the same |
