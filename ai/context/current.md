# turso-per-user — where this repository stands

The entry page for anyone (or any agent) picking this repository up. It is
this repository's own state and does not ship to a site built from it; the
pages that do are [operations.md](operations.md) and
[deployment.md](deployment.md), with the site's `AGENTS.md`.

## What it is

The Turso Per User Starter (notrab/turso-per-user-starter, the template
behind Vercel's Turso Per User Starter) — a Next.js todo app where everyone
who signs up with Clerk gets a Turso database of their own, created through
Turso's Platform API from a seed database, and reached over libSQL's HTTP
protocol — built by OpenNext into one Cloudflare Worker with Static Assets,
packaged as an Orun baseline: `orun new --blueprint repo-blueprint.yaml`
builds a new site in its own repository and takes it to live on stage and
prod in one landing (`01-product`), then records what went live
(`03-docs`). A site is born without Clerk and Turso: its landing serves, and
its sign-in and dashboard say what to connect until its owner stores their
keys.

## Release

| | |
|---|---|
| Latest tag | `baseline-v1` — TP0 to TP2: the repository, a database per user on Workers, and the baseline (blueprint, phases, tests) |
| Proven live | Not yet: proven offline in Baseline CI only (risk TP-A) |
| Registry | Unlisted: the template carries no licence (risk TP-E) |

## Where to read

| Question | Page |
|---|---|
| What shipped, and every departure from upstream | `specs/epics/turso-per-user/IMPLEMENTATION-STATUS.md` |
| Why it is built this way | [decisions.md](decisions.md), then `specs/epics/turso-per-user/design.md` |
| What could still go wrong | [open-risks.md](open-risks.md), then `specs/epics/turso-per-user/risks-and-open-questions.md` |
| How to instantiate it | `BOOTSTRAP.md`, `docs/phases/` |
| What the components are | `apps/web/docs/`, `tests/web/docs/` (generated; `python3 tooling/catalog/gen-component-docs.py`) |

## Next

1. Bootstrap one site from `baseline-v1` from the console and record its
   timings against the 5-minute estimate (closes TP-A).
2. On that site, store a Clerk application's and a Turso organization's keys
   for stage, redeploy, sign up once and add a todo (closes TP-B).
3. The registry row goes public only once the template's licence question
   is settled (TP-E).
