import { afterEach, describe, expect, it, vi } from "vitest";

describe("site identity (apps/web/app/site.ts)", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    vi.resetModules();
  });

  it("names the site and links its source repository", async () => {
    const { SITE_NAME, SOURCE_URL } = await import("app/site");
    expect(SITE_NAME.trim()).not.toBe("");
    expect(SOURCE_URL).toMatch(/^https:\/\/github\.com\/[A-Za-z0-9-]+\/[a-z0-9-]+$/);
  });

  it("takes its origin from NEXT_PUBLIC_SITE_URL, else localhost", async () => {
    expect((await import("app/site")).SITE_URL).toBe("http://localhost:3000");
    vi.resetModules();
    process.env.NEXT_PUBLIC_SITE_URL = "https://todos.example.com";
    expect((await import("app/site")).SITE_URL).toBe("https://todos.example.com");
  });
});

describe("the Clerk switch (apps/web/lib/clerk.ts)", () => {
  afterEach(() => {
    delete process.env.CLERK_CONNECTED;
    vi.resetModules();
  });

  it("is connected only when the build said so", async () => {
    expect((await import("lib/clerk")).clerkConnected).toBe(false);
    vi.resetModules();
    process.env.CLERK_CONNECTED = "true";
    expect((await import("lib/clerk")).clerkConnected).toBe(true);
  });
});
