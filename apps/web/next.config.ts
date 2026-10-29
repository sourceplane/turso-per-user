import type { NextConfig } from "next";
import path from "node:path";

// Clerk is connected when the build has BOTH keys: the publishable key, which
// `next build` inlines into the pages, and the secret key, which the deploy
// hands to the Worker as a Worker secret (tooling/wire/worker-secrets.mjs) and
// which no bundle ever contains. One without the other would build a site
// that fails on its first request, so it builds the "connect Clerk" site
// instead (lib/clerk.ts).
//
// What the build needs of the secret key is that it EXISTS. A deploy builds
// with CLERK_SECRET_KEY_SET and without the key itself (component.yaml's
// buildCommand), so neither the bundles nor the bundler's own cache
// (`.next/cache`, which holds the build's environment) ever see its value; a
// local build reads the key from `.env.local`.
//
// Turso's keys and Clerk's webhook secret are not the build's at all: the
// Worker reads them per request (lib/turso.ts, lib/webhook.ts), so the same
// build serves a site whose owner has not connected Turso yet.
const hasSecretKey =
  Boolean(process.env.CLERK_SECRET_KEY) || process.env.CLERK_SECRET_KEY_SET === "true";
const connected = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) && hasSecretKey;

const nextConfig: NextConfig = {
  env: {
    CLERK_CONNECTED: connected ? "true" : "",
    // The template's routes for Clerk (its <SignIn path> and <SignUp path>),
    // so a deploy needs nothing set but the two keys. A build environment
    // that sets one of these wins.
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "/sign-in",
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "/sign-up",
  },
  turbopack: {
    // The workspace root: Next resolves `next` and the app's dependencies
    // from the monorepo's node_modules.
    root: path.join(__dirname, "../.."),
  },
  // The Open Graph image and favicons are files, served as they are: Workers
  // has no image optimizer behind next/image.
  images: { unoptimized: true },
  // Required by @opennextjs/cloudflare, which bundles `.next/standalone/**`
  // into the Worker. Trace from the monorepo root so workspace dependencies
  // resolve from the root node_modules.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // libSQL's client is one of Next's server-external packages, so the build
  // traces it for Node: of @libsql/isomorphic-ws it copies only node.{cjs,mjs}.
  // The Worker bundle resolves the package's `workerd` export, web.mjs, which
  // the trace left out; include the whole (tiny) package.
  outputFileTracingIncludes: {
    "*": ["../../node_modules/.pnpm/@libsql+isomorphic-ws@*/node_modules/@libsql/isomorphic-ws/**"],
  },
};

export default nextConfig;
