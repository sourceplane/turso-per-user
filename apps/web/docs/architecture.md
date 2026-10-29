# web — architecture

Built by the turbo pipeline from `apps/web` and deployed with wrangler.

|                     |                                                 |
| ------------------- | ----------------------------------------------- |
| Worker config       | `apps/web/wrangler.jsonc`                       |
| Entry               | `.open-next/worker.js`                          |
| Compatibility date  | `2026-10-01`                                    |
| Compatibility flags | `nodejs_compat`, `global_fetch_strictly_public` |

## Bindings

| Binding  | Kind          | Source              |
| -------- | ------------- | ------------------- |
| `ASSETS` | Static assets | `.open-next/assets` |

## Secrets resolved by the lane (names only)

- `CLERK_SECRET_KEY` (optional)
- `CLERK_WEBHOOK_SECRET` (optional)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (optional)
- `TURSO_API_TOKEN` (optional)
- `TURSO_DATABASE_NAME` (optional)
- `TURSO_GROUP_AUTH_TOKEN` (optional)
- `TURSO_ORG` (optional)
