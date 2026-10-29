import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { clerkConnected } from "./lib/clerk";

// Clerk's middleware throws on every request without its keys, so until the
// site has them the proxy passes requests through (lib/clerk.ts).
export default clerkConnected ? clerkMiddleware() : () => NextResponse.next();

export const config = {
  matcher: ["/((?!.+.[w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
