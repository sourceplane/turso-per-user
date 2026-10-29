# turso-per-user — open risks

What is not yet proven or not yet decided. The full write-up of every risk,
including the accepted and resolved ones, is
`specs/epics/turso-per-user/risks-and-open-questions.md`; this page lists
only what is still live, so it should be short.

| ID | Risk | State | What closes it |
|---|---|---|---|
| TP-A | `baseline-v1` is not yet proven live; it is proven offline in Baseline CI (the offline bootstrap, the stage lane's own steps, the site served and smoke-tested not connected and connected to a local stand-in of Turso's Platform API) | OPEN | One console bootstrap from `baseline-v1` |
| TP-B | Signing in and the todo list against a real Clerk application and Turso organization have not run on the Worker: offline, Clerk's servers cannot be reached (a signed-out visitor is checked, a signed-in one is not), the Platform API is a stand-in, and the todo queries run on a local libSQL file, not over HTTP | OPEN | Clerk's and Turso's keys stored on a live site's stage, redeployed, one sign-up and one todo |
| TP-F | A user's database URL is derived as `<name>-<org>.turso.io`, as upstream, not read from the Platform API's hostname | WATCH | Holds while Turso serves that form for every organization |

Accepted, and worth knowing before you change them: TP-C (a database
created before a schema change keeps the old schema), TP-D (Next 16.3.8, not
14), TP-E (no licence anywhere upstream), TP-G (the `/api/health` key names
are not a secret, but they tell a visitor what is connected).
