// The Worker's bindings, as wrangler.jsonc declares them, for
// getCloudflareContext().env. Declared by hand rather than through
// @cloudflare/workers-types, which retypes the global Request and Response.
interface CloudflareEnv {
  ASSETS: { fetch(input: Request | string, init?: RequestInit): Promise<Response> };
}
