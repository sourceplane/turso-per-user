import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";

import { clerkConnected } from "@/lib/clerk";
import { SITE_NAME, SITE_URL } from "./site";
import "./globals.css";

// Inter, self-hosted: the latin subset of its variable font from the
// @fontsource-variable package (OFL-1.1), emitted as a static asset by the
// build. The template loaded it with next/font/google, which fetches Google
// Fonts at build time and fails on GitHub's runners.
const inter = localFont({
  src: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
});

// The Open Graph card is the template's image, served from public/ and named
// in an absolute URL on metadataBase. (As app/opengraph-image.png, Next would
// compile the 750 KB image into the Worker as a route.)
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: "Database per user starter with Turso, Clerk, and SQLite",
  openGraph: {
    siteName: SITE_NAME,
    url: "/",
    images: [{ url: "/opengraph-image.png", type: "image/png", width: 2400, height: 1260 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const page = (
    <html lang="en">
      <body className={`bg-rich-black overscroll-none ${inter.className}`}>{children}</body>
    </html>
  );
  // Not connected, there is no provider: lib/clerk.ts.
  return clerkConnected ? <ClerkProvider>{page}</ClerkProvider> : page;
}
