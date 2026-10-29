#!/usr/bin/env bash
# TIER 2 — the site a bootstrap produces builds, deploys (dry) and serves.
#
# placement.test.sh proves the tree a bootstrap ends with is the right tree.
# This proves it WORKS, by doing to it what its own pipelines will:
#
#   1. at the finished site, the landing's own checks — install with the
#      lockfile the site ships, render fixtures, typecheck, lint, test,
#      build. The bootstrap's own landings are checked in the box with
#      `orun validate` and `orun plan` alone (`checks: local`; their PR's CI
#      on an `orun/BASE-…` branch is `plan` alone, and the convergence on
#      main builds, deploys and smoke-tests the site), so THIS is where a
#      site those steps refuse is caught: before the tag, not after a build
#      has merged it. Every later pull request of the site runs ci.yml's
#      verify lanes;
#   2. the stage lane's own steps, rendered by `orun plan` in the site: on a
#      pull request (the verify profile) `build-app` — the component's
#      buildCommand, origin and all, the same step the deploy profile runs —
#      `verify-build-output` and `deploy-dry-run` (`wrangler deploy --dry-run
#      --name <reponame>-web-stage`). They run IN THE TREE THE RUNNER STAGES
#      for the job (testing/lib/stage-job.py), with the dependency layout the
#      pinned composition produces: if its install step is `scope: lane`, the
#      top-level node_modules is a symlink to the source checkout's; if not,
#      the job's own install step runs inside the staged tree. Run in a plain
#      checkout, this tier was green while the first live bootstrap's lanes
#      died in the lane layout (Turbopack: "Symlink … points out of the
#      filesystem root");
#   3. serve the built Worker with `wrangler dev` and run the component's OWN
#      `smokeCommand` against it, verbatim — the check the real deploy ends
#      with — and then read every route the site promises. A fresh site has
#      no Clerk application or Turso organization, so this is the site as it
#      is born: the template's landing, titled and headed with the site's name
#      and linking the site's repository, its assets, /api/health ok, sign-up,
#      sign-in and the dashboard saying Clerk is not connected yet (naming the
#      keys), /dump.sql and the webhook answering 503;
#   4. the same stage lane's build-app again, now with Clerk's and Turso's
#      keys in its environment as the optional secret refs put them there
#      (made-up keys), and the result checked: Clerk's publishable key in the
#      pages, no other key in any file of the build, the six handed to the
#      Worker only from a lane that can deploy. Served with them as the deploy
#      hands them over (wrangler's .dev.vars) and Turso's Platform API a local
#      stand-in (lib/stand-in.py): Clerk's middleware answers, a signed-out
#      visitor is sent to sign-in, and Clerk's webhook — Svix-signed here as
#      Clerk signs it — creates the new user's database as the template asks
#      Turso to (read back from the stand-in), while a forged, stale or
#      re-serialised delivery and any other event create nothing. Served
#      WITHOUT Clerk's secret key, the deploy's smoke must fail: a Worker that
#      lost it is caught by the deploy, not by a visitor. (Signing in itself
#      needs Clerk's servers, so no tier here does it; the todo queries run on
#      a real libSQL file in tests/web.)
#
# What it cannot do is the platform's half: create the repository, mint the
# brokered Cloudflare token, deploy for real and probe workers.dev. That is a
# bootstrap against a workspace (BOOTSTRAP.md); everything short of it is here.
#
# Needs: orun, node, pnpm, python3 (+PyYAML), git, curl, and the network for
# `pnpm install` (or a warm store). A few minutes: two installs and three
# builds (the landing's checks over the site, and the stage lane's own in its
# staged tree, without Clerk's and Turso's keys and with them).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/.." && pwd)"
# shellcheck source=lib/bootstrap.sh
source "$here/lib/bootstrap.sh"

for bin in orun node pnpm python3 git curl; do
  command -v "$bin" >/dev/null || { echo "e2e.test.sh needs $bin on PATH" >&2; exit 1; }
done

scratch="$(mktemp -d)"
dev_pid=""
# wrangler dev runs under pnpm, node and two workerd processes; a TERM to the
# first does not reach the rest, and waiting on it then never returns. So it is
# started as its own process group (setsid) and the whole group is stopped.
cleanup() {
  if [ -n "$dev_pid" ]; then
    kill -TERM -- "-$dev_pid" 2>/dev/null || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do kill -0 -- "-$dev_pid" 2>/dev/null || break; sleep 0.5; done
    kill -KILL -- "-$dev_pid" 2>/dev/null || true
  fi
  rm -rf "$scratch"
}
trap cleanup EXIT
values="$here/fixtures/acme.json"
repo="$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['reponame'])" "$values")"
sub="$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['subdomain'])" "$values")"
export CI=1 WRANGLER_SEND_METRICS=false NEXT_TELEMETRY_DISABLED=1 TURBO_TELEMETRY_DISABLED=1

# The landing's own checks, step for step, run here at once on the whole
# tree. A pull request in the site builds and dry-deploys it through ci.yml's
# lanes; the lint and the tests run here, and by hand before a push.
LANDING_CHECKS=(
  "pnpm install --frozen-lockfile"
  "pnpm run wire:fixture"
  "pnpm typecheck"
  "pnpm lint"
  "pnpm test"
  "pnpm build"
)
checks() { # DIR LOG
  local dir="$1" log="$2" cmd
  for cmd in "${LANDING_CHECKS[@]}"; do
    echo "   \$ $cmd" | tee -a "$log"
    if ! (cd "$dir" && bash -c "$cmd") >> "$log" 2>&1; then
      echo "FAIL: \`$cmd\` failed in $dir" >&2; tail -40 "$log" >&2; return 1
    fi
  done
}

echo "── the offline bootstrap (testing/lib/bootstrap.sh)"
tree="$scratch/$repo"
bootstrap_offline "$root" "$tree" "$values" "$scratch/logs" > "$scratch/bootstrap.log" 2>&1 || {
  echo "FAIL: the offline bootstrap stopped" >&2; tail -40 "$scratch/bootstrap.log" >&2; exit 1; }
echo "   2 phases placed and landed"

# ── 1. the finished site ───────────────────────────────────────────────────
echo "── the finished site: install, the fixture render, typecheck, lint, test, build"
checks "$tree" "$scratch/checks-site.log"

# ── 2. the deploy lane's steps, for stage ──────────────────────────────────
echo "── the stage lane: build-app, verify-build-output, deploy-dry-run"
# The 01-product landing over the repository's empty first commit: every file
# of the site changed, as on its pull request.
s00="$(git -C "$tree" rev-parse HEAD~2)"; s01="$(git -C "$tree" rev-parse HEAD~1)"
(cd "$tree" && orun plan --intent intent.yaml --trigger github-pull-request --changed \
   --base "$s00" --head "$s01" --env stage --output "$scratch/plan.json") > "$scratch/plan.log" 2>&1 \
  || { echo "FAIL: orun plan" >&2; tail -15 "$scratch/plan.log" >&2; exit 1; }
python3 - "$scratch/plan.json" "$scratch/steps" <<'PY'
import json, pathlib, sys
plan = json.load(open(sys.argv[1]))
out = pathlib.Path(sys.argv[2]); out.mkdir()
job = next(j for j in plan["jobs"] if j["component"] == "web" and j["environment"] == "stage")
for s in job["steps"]:
    if s["id"] in ("build-app", "verify-build-output", "deploy-dry-run"):
        (out / f"{s['id']}.sh").write_text(s.get("run") or "")
    if s["id"] == "install-workspace-dependencies":
        (out / "install.sh").write_text(s.get("run") or "")
        (out / "install.wd").write_text(s.get("working-directory") or ".")
        (out / "install.scope").write_text(s.get("scope") or "job")
(out / "path").write_text(job.get("path") or "apps/web")
for k, v in (job.get("env") or {}).items():
    (out / "env").open("a").write(f"export {k}={json.dumps(v)}\n")
PY
# The job's private tree, staged as orun stages it. The source checkout
# carries no build output (a CI checkout has none, so the plain-tree build's is
# removed rather than copied in), and its dependencies are what the pinned
# composition says: a lane-scoped install ran once in the source tree (step 1
# ran the same command) and is linked in, or the job installs its own.
rm -rf "$tree/apps/web/.open-next" "$tree/apps/web/.wrangler"
work="$tree/.orun/runs/e2e/web.stage.verify-deploy/work"
[ -f "$scratch/steps/install.sh" ] || { echo "FAIL: the stage lane has no install step" >&2; exit 1; }
if [ "$(cat "$scratch/steps/install.scope")" = lane ]; then
  python3 "$here/lib/stage-job.py" "$tree" "$work" --shared-deps
  [ -L "$work/node_modules" ] || { echo "FAIL: the staged tree's node_modules is not the lane's symlink" >&2; exit 1; }
  echo "   staged: $(realpath --relative-to="$tree" "$work"); install scope: lane — node_modules → the source tree's"
else
  python3 "$here/lib/stage-job.py" "$tree" "$work"
  echo "   staged: $(realpath --relative-to="$tree" "$work"); install scope: job — installing inside it"
  echo "   ▸ install-workspace-dependencies"
  (cd "$work/$(cat "$scratch/steps/path")/$(cat "$scratch/steps/install.wd")" && bash -e "$scratch/steps/install.sh") \
    > "$scratch/install.log" 2>&1 || { echo "FAIL: the lane's install step" >&2; tail -30 "$scratch/install.log" >&2; exit 1; }
  [ -d "$work/node_modules" ] && [ ! -L "$work/node_modules" ] \
    || { echo "FAIL: the job's install did not land inside its own tree" >&2; exit 1; }
fi
for step in build-app verify-build-output deploy-dry-run; do
  [ -f "$scratch/steps/$step.sh" ] || { echo "FAIL: the stage verify lane has no $step step" >&2; exit 1; }
  echo "   ▸ $step"
  # The runner's per-job environment: the job's env (intent environment
  # `env:`) and ORUN_ENVIRONMENT; the step runs in the component's directory.
  if ! (cd "$work/$(cat "$scratch/steps/path")" && \
        { [ -f "$scratch/steps/env" ] && source "$scratch/steps/env"; true; } && \
        export ORUN_ENVIRONMENT=stage && bash -e "$scratch/steps/$step.sh") > "$scratch/$step.log" 2>&1; then
    echo "FAIL: the deploy lane's $step step" >&2; tail -40 "$scratch/$step.log" >&2; exit 1
  fi
done

# ── 3. serve it, and smoke it as the deploy does ───────────────────────────
# serve DIR LOG [DEV_VARS [CONFIG]] — wrangler dev over the built Worker in
# DIR, on a free port; sets $url. DEV_VARS, when given, is the Worker's
# secrets file; CONFIG another wrangler config in DIR.
serve() {
  local dir="$1" log="$2" vars="${3:-}" config="${4:-wrangler.jsonc}"
  stop_dev
  port=$(python3 -c "import socket;s=socket.socket();s.bind(('127.0.0.1',0));print(s.getsockname()[1]);s.close()")
  rm -f "$dir/.dev.vars"
  [ -n "$vars" ] && cp "$vars" "$dir/.dev.vars"
  (cd "$dir" && exec setsid pnpm exec wrangler dev --config "$config" --ip 127.0.0.1 --port "$port" \
     --name "$repo-web-stage" --show-interactive-dev-session=false) > "$log" 2>&1 < /dev/null &
  dev_pid=$!
  # By name, not by address: wrangler dev hands the Worker `localhost` as the
  # request's host whichever address it was reached on; on workers.dev the
  # two agree.
  url="http://localhost:$port"
  for _ in $(seq 1 90); do
    curl -s -o /dev/null "$url/" && return 0
    kill -0 "$dev_pid" 2>/dev/null || { echo "FAIL: wrangler dev exited" >&2; tail -30 "$log" >&2; exit 1; }
    sleep 1
  done
  curl -s -o /dev/null "$url/" || { echo "FAIL: wrangler dev never answered" >&2; tail -30 "$log" >&2; exit 1; }
}
stop_dev() {
  if [ -n "$dev_pid" ]; then
    kill -TERM -- "-$dev_pid" 2>/dev/null || true
    for _ in 1 2 3 4 5 6 7 8 9 10; do kill -0 -- "-$dev_pid" 2>/dev/null || break; sleep 0.5; done
    kill -KILL -- "-$dev_pid" 2>/dev/null || true
    dev_pid=""
  fi
}
smoke="$(python3 -c "import yaml,sys;print(yaml.safe_load(open(sys.argv[1]))['spec']['parameters']['smokeCommand'])" "$tree/apps/web/component.yaml")"
app="$work/$(cat "$scratch/steps/path")"

echo "── wrangler dev over the built Worker: the site as it is born, Clerk and Turso not connected"
serve "$app" "$scratch/dev.log"
echo "   ▸ the component's own smokeCommand, DEPLOYED_URL=$url"
DEPLOYED_URL="$url" bash -c "$smoke" || { echo "FAIL: the deploy's smoke refused the site" >&2; exit 1; }

echo "   ▸ every route the site promises"
# routes MODE [STAND_IN_LOG KEYS_JSON] — MODE not-connected | connected.
routes() {
python3 - "$url" "$values" "https://$repo-web-stage.$sub.workers.dev" "$@" <<'PY'
import base64, hashlib, hmac, html, json, re, sys, time, urllib.error, urllib.request
base, values, origin, mode = sys.argv[1], json.load(open(sys.argv[2])), sys.argv[3], sys.argv[4]
log = sys.argv[5] if len(sys.argv) > 5 else None
keys = json.loads(sys.argv[6]) if len(sys.argv) > 6 else {}
name, repo, org = values["productname"], values["reponame"], values["githuborg"]
problems = []
def bad(m): problems.append(m)

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None
opener = urllib.request.build_opener(NoRedirect)
def call(method, path, body=None, headers=None):
    data = body.encode() if isinstance(body, str) else None
    req = urllib.request.Request(base + path, data=data, method=method, headers=headers or {})
    try:
        with opener.open(req, timeout=60) as r:
            return r.status, dict(r.headers), r.read().decode(errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode(errors="replace")
def as_json(text):
    try:
        return json.loads(text)
    except ValueError:
        return None
def calls():
    if not log:
        return []
    try:
        return [json.loads(l) for l in open(log) if l.strip()]
    except FileNotFoundError:
        return []

status, headers, page = call("GET", "/")
if status != 200 or "</html>" not in page:
    bad(f"/ answered {status}, or did not render to its end")
title = re.search(r"<title>(.*?)</title>", page, re.S)
if not title or html.unescape(title.group(1)) != name:
    bad(f"the landing's <title> is {title and title.group(1)!r}, not {name!r}")
text = html.unescape(re.sub(r"<!-- -->", "", page))
h1 = re.search(r"<h1[^>]*>(.*?)</h1>", page, re.S)
if not h1 or html.unescape(re.sub(r"<[^>]+>|<!-- -->", "", h1.group(1))) != name:
    bad(f"the landing's heading is {h1 and h1.group(1)!r}, not {name!r}")
for want in ("Database per user demo", "Sign up", "login", "What is Turso?", "GitHub Repo"):
    if want not in text:
        bad(f"the landing lost the template's {want!r}")
if f'href="https://github.com/{org}/{repo}"' not in page:
    bad(f"the landing's \"GitHub Repo\" does not link the site's repository github.com/{org}/{repo}")
m = re.search(r'<meta property="og:image" content="([^"]+)"', page)
if not m or m.group(1) != f"{origin}/opengraph-image.png":
    bad(f"the og:image card is not the template's image, absolute on {origin}: {m and m.group(1)}")
if "Turso Per User Starter" in page or "turso-per-user" in page.replace("turso-per-user-starter", ""):
    bad("the landing still carries the baseline's name")
for gone in ("vercel.app", "vercel.com", "notrab/turso-platforms-starter", "fonts.googleapis.com"):
    if gone in page.lower():
        bad(f"the landing still carries {gone!r}")
for asset in ("/opengraph-image.png", "/favicon.ico"):
    s, _, _ = call("GET", asset)
    if s != 200:
        bad(f"{asset} answered {s}")

s, _, body = call("GET", "/api/health")
want = {"ok": True, "clerk": mode, "turso": mode, "webhook": mode}
if s != 200 or as_json(body) != want:
    bad(f"/api/health answered {s} {body[:160]!r}, want 200 {want}")
s, _, _ = call("GET", "/no-such-page")
if s != 404:
    bad(f"/no-such-page answered {s}, want 404")

# A webhook delivery as Clerk sends it through Svix: the signature is the
# HMAC-SHA256, under the endpoint's secret, of "<id>.<timestamp>.<body>".
def delivery(event, secret=None, ts=None, raw=None):
    body = raw if raw is not None else json.dumps(event, separators=(",", ":"))
    signed = json.dumps(event, separators=(",", ":"))
    mid, ts = f"msg_e2e_{abs(hash(signed)) % 10**8}", str(ts or int(time.time()))
    key = base64.b64decode((secret or keys.get("CLERK_WEBHOOK_SECRET") or "whsec_" + "A" * 32).split("_", 1)[1])
    sig = base64.b64encode(hmac.new(key, f"{mid}.{ts}.{signed}".encode(), hashlib.sha256).digest()).decode()
    return call("POST", "/webhooks/clerk", body,
                {"svix-id": mid, "svix-timestamp": ts, "svix-signature": f"v1,{sig}", "content-type": "application/json"})
user = "user_2nZ0E2eFixtureClerkId"
created = {"type": "user.created", "data": {"id": user}}

if mode == "not-connected":
    if "Sign up" not in text or 'data-connect=' in page:
        bad("the landing does not offer sign-up and sign-in as the template does")
    for path in ("/sign-in", "/sign-up", "/dashboard"):
        s, _, body = call("GET", path)
        b = html.unescape(body)
        if s != 200 or "Clerk is not connected yet" not in b or "CLERK_SECRET_KEY" not in b:
            bad(f"{path} answered {s} without the connect-Clerk notice")
    s, h, _ = call("GET", "/welcome")
    if s not in (302, 303, 307, 308) or not h.get("location", h.get("Location", "")).endswith("/sign-in"):
        bad(f"/welcome answered {s} {h.get('location')!r} — want a redirect to /sign-in, where the notice is")
    s, _, body = call("GET", "/dump.sql")
    if s != 503 or "Clerk is not connected yet" not in body:
        bad(f"/dump.sql answered {s} {body[:80]!r} — want 503")
    s, _, body = delivery(created)
    if s != 503 or as_json(body) != {"error": "The Clerk webhook is not connected", "missing": ["CLERK_WEBHOOK_SECRET"]}:
        bad(f"the webhook answered {s} {body[:120]!r} without its secret — want 503 and what is missing")
else:
    loc = lambda h: h.get("location") or h.get("Location") or ""
    if headers.get("x-clerk-auth-status") != "signed-out":
        bad(f"Clerk's middleware did not answer the landing (x-clerk-auth-status {headers.get('x-clerk-auth-status')!r})")
    s, _, body = call("GET", "/sign-in")
    if s != 200 or "Clerk is not connected yet" in body:
        bad(f"/sign-in answered {s}, or still says Clerk is not connected")
    # A signed-out visitor: the dashboard sends them to /welcome (no database
    # of theirs), and /welcome and /dump.sql to sign-in — never a page.
    s, h, body = call("GET", "/dashboard")
    if s not in (302, 303, 307, 308) or not loc(h).endswith("/welcome"):
        bad(f"/dashboard answered {s} {loc(h)!r} to a signed-out visitor — want a redirect to /welcome")
    for path in ("/welcome", "/dump.sql"):
        s, h, body = call("GET", path)
        if s not in (302, 303, 307, 308) or "/sign-in?redirect_url=" not in loc(h):
            bad(f"{path} answered {s} {loc(h)!r} to a signed-out visitor — want a redirect to /sign-in")

    before = len(calls())
    forged = delivery(created, secret="whsec_" + base64.b64encode(b"not-the-endpoint-secret-0").decode())
    stale = delivery(created, ts=int(time.time()) - 15 * 60)
    reserialised = delivery(created, raw=json.dumps(created, indent=2))
    other = delivery({"type": "user.updated", "data": {"id": user}})
    for what, (s, _, b) in (("a forged", forged), ("a stale", stale), ("a re-serialised", reserialised), ("a user.updated", other)):
        if s != 400:
            bad(f"{what} delivery answered {s} {b[:80]!r} — want 400")
    if len(calls()) != before:
        bad(f"a refused delivery still reached Turso: {[c['path'] for c in calls()[before:]]}")
    s, _, body = delivery(created)
    if s != 200:
        bad(f"a signed user.created answered {s} {body[:120]!r} — want 200")
    got = calls()[before:]
    posts = [c for c in got if c["method"] == "POST"]
    if len(posts) != 1:
        bad(f"one signed user.created sent {[(c['method'], c['path']) for c in got]} — want one database created")
    else:
        c = posts[0]
        if c["path"] != f"/v1/organizations/{keys['TURSO_ORG']}/databases":
            bad(f"the database was created at {c['path']}, not in the TURSO_ORG organization")
        if c["authorization"] != f"Bearer {keys['TURSO_API_TOKEN']}":
            bad("Turso was not called with the TURSO_API_TOKEN the Worker holds")
        want_db = {"name": hashlib.md5(user.encode()).hexdigest(), "group": "default",
                   "seed": {"type": "database", "name": keys["TURSO_DATABASE_NAME"]}}
        if c["body"] != want_db:
            bad(f"Turso was asked for {json.dumps(c['body'])[:200]}, not the template's database {want_db}")
    leaked = [k for k, v in keys.items() if k != "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" and (v in page or v in body)]
    if leaked:
        bad(f"a response carries the value of {leaked}")

if problems:
    for p in problems:
        print(f"  ✕ {p}", file=sys.stderr)
    sys.exit(1)
extra = ("; a signed-out visitor sent to sign-in, a signed user.created creates the user's database as the template asks Turso to, and forged, stale, re-serialised and other deliveries create nothing"
         if mode == "connected" else "; sign-in, sign-up and the dashboard say Clerk is not connected yet, the webhook 503")
print(f"   /, its assets, /api/health, /sign-in, /dashboard, /welcome, /dump.sql, /webhooks/clerk and a 404 — the site's own, Clerk and Turso {mode}, on {origin}{extra}")
PY
}
routes not-connected

# ── 4. the same lane, with Clerk's and Turso's keys ────────────────────────
# Made-up keys in the shapes the services issue (Clerk's publishable key is
# base64 of a Frontend API host and `$`; the host is never contacted — a
# signed-out request needs nothing from Clerk). Turso's Platform API is a
# local stand-in (lib/stand-in.py).
echo "── the stage lane's build-app again, with Clerk's and Turso's keys as the optional refs supply them"
rnd() { python3 -c "import secrets;print(secrets.token_hex(12))"; }
export E2E_NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_$(printf 'e2e-fixture-00.clerk.accounts.dev$' | base64 | tr -d '\n')" \
       E2E_CLERK_SECRET_KEY="sk_test_e2e_$(rnd)" \
       E2E_CLERK_WEBHOOK_SECRET="whsec_$(python3 -c 'import base64,os;print(base64.b64encode(os.urandom(24)).decode())')" \
       E2E_TURSO_API_TOKEN="turso_platform_e2e_$(rnd)" E2E_TURSO_ORG="e2e-org-$(rnd)" \
       E2E_TURSO_DATABASE_NAME="seed-$(rnd)" E2E_TURSO_GROUP_AUTH_TOKEN="turso_group_e2e_$(rnd)"
KEYS=(NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY CLERK_SECRET_KEY CLERK_WEBHOOK_SECRET TURSO_API_TOKEN TURSO_ORG TURSO_DATABASE_NAME TURSO_GROUP_AUTH_TOKEN)
WORKER_KEYS=(CLERK_SECRET_KEY CLERK_WEBHOOK_SECRET TURSO_API_TOKEN TURSO_ORG TURSO_DATABASE_NAME TURSO_GROUP_AUTH_TOKEN)
rm -rf "$app/.open-next" "$app/.next" "$app/.wrangler"
if ! (cd "$app" && { [ -f "$scratch/steps/env" ] && source "$scratch/steps/env"; true; } && \
      export ORUN_ENVIRONMENT=stage && for k in "${KEYS[@]}"; do v="E2E_$k"; export "$k=${!v}"; done && \
      unset CLOUDFLARE_API_TOKEN && bash -e "$scratch/steps/build-app.sh") > "$scratch/build-app-keys.log" 2>&1; then
  echo "FAIL: the deploy lane's build-app step, with the keys" >&2; tail -40 "$scratch/build-app-keys.log" >&2; exit 1
fi
grep -qF "worker-secrets: no Cloudflare credential in this job (a verify lane) — $(IFS=,; echo "${WORKER_KEYS[*]}" | sed 's/,/, /g') reach $repo-web-stage from the deploy lane" \
  "$scratch/build-app-keys.log" || { echo "FAIL: the build did not hand the six keys to $repo-web-stage (or claimed to from a verify lane)" >&2; tail -10 "$scratch/build-app-keys.log" >&2; exit 1; }
for k in "${WORKER_KEYS[@]}"; do
  v="E2E_$k"
  if grep -rlF -- "${!v}" "$app/.open-next" "$app/.next" "$scratch/build-app-keys.log" > "$scratch/leaks.txt" 2>/dev/null; then
    echo "FAIL: $k's value is in the build:" >&2; head -5 "$scratch/leaks.txt" >&2; exit 1
  fi
done
grep -rqF -- "$E2E_NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" "$app/.open-next/assets" \
  || { echo "FAIL: Clerk's publishable key was not inlined into the pages" >&2; exit 1; }
echo "   no Worker key in any file of the build or its log; the publishable key in the pages; the keys pushed only by a deploy lane"
(cd "$app" && { [ -f "$scratch/steps/env" ] && source "$scratch/steps/env"; true; } && \
   export ORUN_ENVIRONMENT=stage && bash -e "$scratch/steps/verify-build-output.sh") > "$scratch/verify-keys.log" 2>&1 \
  || { echo "FAIL: verify-build-output, with the keys" >&2; tail -20 "$scratch/verify-keys.log" >&2; exit 1; }

echo "── wrangler dev over it, with the secrets the deploy hands the Worker, Turso's Platform API a local stand-in"
python3 "$here/lib/stand-in.py" "$scratch/stand-in.port" "$scratch/stand-in.jsonl" &
stand_in_pid=$!
trap 'kill "$stand_in_pid" 2>/dev/null || true; cleanup' EXIT
for _ in $(seq 1 50); do [ -s "$scratch/stand-in.port" ] && break; sleep 0.1; done
[ -s "$scratch/stand-in.port" ] || { echo "FAIL: the stand-in never listened" >&2; exit 1; }
(for k in "${WORKER_KEYS[@]}"; do v="E2E_$k"; export "$k=${!v}"; done
 secret_args=(); for k in "${WORKER_KEYS[@]}"; do secret_args+=(--secret "$k"); done
 node "$tree/tooling/wire/worker-secrets.mjs" "${secret_args[@]}" --dev-vars "$scratch/keys.dev.vars") > /dev/null
printf 'TURSO_API_BASE_URL="http://127.0.0.1:%s/v1/"\n' "$(cat "$scratch/stand-in.port")" >> "$scratch/keys.dev.vars"
serve "$app" "$scratch/dev-keys.log" "$scratch/keys.dev.vars"
echo "   ▸ the component's own smokeCommand, DEPLOYED_URL=$url"
DEPLOYED_URL="$url" bash -c "$smoke" || { echo "FAIL: the deploy's smoke refused the site with Clerk and Turso connected" >&2; exit 1; }
echo "   ▸ every route the site promises, and Clerk's webhook end to end"
routes connected "$scratch/stand-in.jsonl" \
  "$(python3 -c 'import json,os,sys;print(json.dumps({k:os.environ["E2E_"+k] for k in sys.argv[1:]}))' "${KEYS[@]}")"

echo "── and without Clerk's secret key: the deploy's smoke must refuse a Worker that lost it"
grep -v '^CLERK_SECRET_KEY=' "$scratch/keys.dev.vars" > "$scratch/nosecret.dev.vars"
serve "$app" "$scratch/dev-nosecret.log" "$scratch/nosecret.dev.vars"
if DEPLOYED_URL="$url" bash -c "$smoke" 2>/dev/null; then
  echo "FAIL: the smoke passed a connected site whose Worker has no CLERK_SECRET_KEY" >&2; exit 1
fi
echo "   refused"
stop_dev

echo "e2e.test.sh: ok"
