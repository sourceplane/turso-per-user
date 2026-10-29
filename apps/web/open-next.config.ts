// OpenNext Cloudflare adapter config.
//
// The landing and sign-in pages render per request (they read the visitor's
// Clerk session) and the todos are read from each user's own database on
// every visit; the server actions revalidate /dashboard, which renders per
// request anyway. Nothing is pre-rendered for a later visitor to reuse, so
// the static-assets incremental cache (read only, no R2/KV/D1 to provision)
// serves the few build-time pages there are. A change that caches renders
// (ISR, `revalidateTag`, "use cache") swaps this for the R2 incremental cache
// plus a tag cache.
import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
