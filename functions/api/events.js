// First-party analytics intake (docs/TRACKING_PLAN.md). POST one event; anything off the
// allowlist is rejected with 400. No D1 binding (preview without a database) = 204, nothing stored.
import { storeClientEvent, validateClientEvent } from "./lib/tracking.mjs";

const MAX_BODY_BYTES = 4096;
const NO_CONTENT = { status: 204, headers: { "Cache-Control": "no-store" } };

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return new Response(null, { status: 403 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return new Response(null, { status: 413 });

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  const event = validateClientEvent(body);
  if (!event) return new Response(null, { status: 400 });

  const write = storeClientEvent(request, env, event);
  context.waitUntil(write);
  return new Response(null, NO_CONTENT);
}

export function onRequest() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
