// The site's identity, written once. The page title, the Open Graph card and
// the landing's heading read SITE_NAME; the landing's "GitHub Repo" link and
// the user menu's "Star repository" are SOURCE_URL. A product built from this
// baseline gets both rewritten to its own name and repository at
// instantiation, so keep them literal and on one line each.
export const SITE_NAME = "Turso Per User Starter";
export const SOURCE_URL = "https://github.com/sourceplane/turso-per-user";

// The site's public origin, for metadataBase (the Open Graph image's absolute
// URL). The Orun build sets NEXT_PUBLIC_SITE_URL per environment: its
// SITE_URL from intent.yaml, else its workers.dev URL.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
