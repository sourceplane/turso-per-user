# turso-per-user — risks and open questions

| ID | Risk | State | Notes |
|---|---|---|---|
| TP-A | `baseline-v1` is not yet proven live | OPEN | Proven offline in Baseline CI: the offline bootstrap with the blueprint's own hooks, the stage lane's own steps in a staged job tree, the site served by `wrangler dev` and smoke-tested with the component's own command — not connected, and connected to a local stand-in. A console bootstrap closes it |
| TP-B | A real sign-up, database and todo | OPEN | Offline, Clerk's middleware answers a signed-out visitor (redirects to sign-in) but nobody signs in — that needs Clerk's servers; the webhook's request to Turso is read back from a stand-in; the todo queries run on a local libSQL file through the libsql client's file mode, since there is no libSQL server here (the Worker uses the web client over HTTP with the same driver). The first `wrangler secret bulk` on a Worker that does not exist yet has not run live (clerk-auth-starter's CK-B is the same push). Closed by storing the keys on a live site's stage, signing up once and adding a todo |
| TP-C | A schema change reaches only databases created after it | ACCEPTED | `db:migrate` applies to the seed; every user's database is a copy taken when it was created, as upstream. The product's README says so ("Change the schema") |
| TP-D | Next 16.3.8, not the template's 14 | ACCEPTED | OpenNext 1.20 refuses Next 15.5 at build, and every OpenNext starter here is proven on 16.3.8; Clerk 5 → 7 came with it (`auth()` is async, `middleware.ts` is `proxy.ts`) |
| TP-E | No licence | ACCEPTED | GitHub records none, the repository has no LICENSE file, its `package.json` no `license`, its README no licence section. The registry lists the row unlisted until its owner decides; the README credits the template by name and link |
| TP-F | A user's database URL is derived, not looked up | WATCH | `libsql://<name>-<org>.turso.io`, as upstream and its `drizzle.config.ts`; the Platform API's own hostname would survive a change of form, at the cost of a call per request |
| TP-G | `/api/health` names what is connected | ACCEPTED | Names and states only, never a value; the deploy's smoke needs it |
