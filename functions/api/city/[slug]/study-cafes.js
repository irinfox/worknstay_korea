// Live Kakao study-café count for one city card. Kakao's terms forbid any caching or storage,
// so the response is never cached (Cache-Control: no-store) and nothing is kept server-side.
// Missing key or any Kakao failure returns { degraded: true } so the card keeps its fallback.
import cities from "../../../../src/_data/cities.json";
import { countStudyCafes } from "../../lib/kakao-client.mjs";
import { latencyBucket, logApiCall } from "../../lib/tracking.mjs";

export async function onRequestGet(context) {
  const { params, env } = context;
  const city = cities.find((c) => c.slug === params.slug);
  if (!city) {
    return Response.json({ error: "Unknown city" }, { status: 404 });
  }
  const startedAt = Date.now();
  const result = await countStudyCafes(city, env);
  const status = !env?.KAKAO_REST_API_KEY
    ? "skipped_no_key"
    : !result.degraded
      ? (result.count === 0 ? "empty" : "ok")
      : /HTTP 429/.test(result.reason || "") ? "quota" : "error";
  logApiCall(context, {
    endpoint: "kakao_study_cafe",
    region: city.regionSlug,
    city: city.slug,
    status,
    retried: false, // the browser owns the single retry (study-cafes.js); each attempt logs itself
    fallback_served: Boolean(result.degraded),
    latency_ms_bucket: latencyBucket(Date.now() - startedAt),
  });
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
