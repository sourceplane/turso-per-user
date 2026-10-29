// Whether this build was made with a Clerk application's keys.
//
// Clerk's publishable key is inlined into the pages at build time, and its
// secret key is read by the Worker at request time, so a site with no Clerk
// application yet cannot render Clerk at all: <ClerkProvider> and the proxy
// throw "Clerk keys are missing". next.config.ts decides once, at build, from
// both keys being in the build's environment (in a deployed environment, the
// CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY Orun secrets), and inlines the
// answer here. Not connected, every page renders with a "connect Clerk"
// notice where sign-in would be and the proxy passes requests through;
// connected, the site is the template unchanged.
export const clerkConnected = process.env.CLERK_CONNECTED === "true";

// Where an owner creates the application whose keys connect the site.
export const CLERK_DASHBOARD_URL = "https://dashboard.clerk.com";
