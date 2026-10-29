import { handleClerkWebhook } from "@/lib/webhook";

// Clerk's `user.created` webhook (README → The webhook): the signature is
// checked against the raw body before anything else (lib/webhook.ts).
export async function POST(req: Request) {
  return handleClerkWebhook(await req.text(), req.headers);
}
