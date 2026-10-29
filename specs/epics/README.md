# Epics

Orun-style work programs. Each epic is a folder carrying `epic.yaml` (the
declaration the platform reads: slug, key prefix, milestones with exit
criteria and task keys) beside its doc set. The pull request that adds the
folder is the adoption; the merge creates the epic in the workspace.

| Epic | Cluster | Status | What it is |
|------|---------|--------|------------|
| [`turso-per-user/`](./turso-per-user/) | **TP** | In progress (TP0) | Vercel's Turso Per User Starter — a Next.js todo app with a Turso database per user, created through Turso's Platform API — on Cloudflare Workers + Static Assets through OpenNext, Turso kept as a SaaS over libSQL's HTTP protocol, Clerk's and Turso's keys as Orun secrets, and an Orun baseline that instantiates it (TP2) |

As-built ≠ intent: what shipped lives in each epic's `IMPLEMENTATION-STATUS.md`.
