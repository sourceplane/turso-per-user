# web-tests

The site's vitest suite (the site's identity and the Clerk switch, Turso's connection and its Platform API calls against a local stand-in, Clerk's webhook signature check, the todo queries on a real libSQL file, and the Worker-secret push), run with pnpm test

The test suite for **web**. It deploys nothing: its lane installs, builds and runs the tests.

|              |                      |
| ------------ | -------------------- |
| Type         | `turbo-package`      |
| Source       | `tests/web`          |
| Package      | `@app/web-tests`     |
| Environments | `dev`: `quick-check` |

## Depends on

- (none)

## Depended on by

- (none)
