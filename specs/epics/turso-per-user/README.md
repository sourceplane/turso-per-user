# turso-per-user — Vercel's Turso Per User Starter on Cloudflare Workers

**The Turso Per User Starter built by OpenNext into one Cloudflare Worker,
deployed by Orun to stage and prod on every merge — every user who signs up
with Clerk given a Turso database of their own by Turso's Platform API, their
todos read and written in it over libSQL's HTTP protocol, and a site that
serves before its owner has connected either — and the baseline that makes a
copy of it somebody else's in one landing.**

| | |
|---|---|
| Status | In progress — TP1 on main: the site runs on Workers |
| Upstream | [notrab/turso-per-user-starter](https://github.com/notrab/turso-per-user-starter), at `590144a` (2025-04-03) |
| Reference | [notion-waitlist](https://github.com/sourceplane/notion-waitlist) — portfolio-starter-kit's scaffolding, tests and bootstrap, with a SaaS's keys as optional Orun secrets; [clerk-auth-starter](https://github.com/sourceplane/clerk-auth-starter) — Clerk on Workers and the site before Clerk is connected; [turso-starter](https://github.com/sourceplane/turso-starter) — the canonical shape |
| Key | `TP` (turso-starter's is `TU`) |

## Read in this order

1. [design.md](design.md) — the template, how each Vercel piece maps to
   Cloudflare, Turso kept as a SaaS, the webhook, the site before Clerk and
   Turso are connected, the repository and the build, and the alternatives
   rejected.
2. [implementation-plan.md](implementation-plan.md) — the milestones and
   what each one lands.
3. [risks-and-open-questions.md](risks-and-open-questions.md) — what is not
   proven, and what was accepted.
4. [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md) — what shipped, and
   every departure from the upstream template.

## Milestones

| Milestone | What it lands | Task |
|---|---|---|
| TP0 — the spec | the repository, its intent, CI, tooling and spec index; this doc set | TP-1 |
| TP1 — a database per user on Workers | the template in `apps/web`, built by OpenNext into one Worker; the web libSQL client; the Clerk and Turso switches; the webhook checked on its raw body; the Worker-secret push; `tests/web` | TP-2 |
| TP2 — a baseline | the console card, the build document, the context pack and the baseline's tests | TP-3 |
