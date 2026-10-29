# web

The todo app with a database per user — Clerk sign-up and sign-in, each user's own Turso database created through Turso's Platform API (a signed Clerk webhook, or the first visit), the todos read and written in it over libSQL's HTTP protocol (Next.js on Cloudflare Workers + Static Assets via @opennextjs/cloudflare, per environment)

A Cloudflare Worker with Static Assets (server rendering plus static files), deployed per environment by its CI lane.

|              |                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| Type         | `cloudflare-workers-assets-turbo`                                                                                  |
| Source       | `apps/web`                                                                                                         |
| Package      | `@app/web`                                                                                                         |
| Environments | `dev`: `verify` · `stage`: `verify`, `deploy` on a push to `main` · `prod`: `verify`, `deploy` on a push to `main` |

## Depends on

- (none)

## Depended on by

- (none)
