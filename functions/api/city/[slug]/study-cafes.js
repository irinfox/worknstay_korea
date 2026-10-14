// Live Kakao study-café count for one city card. Kakao's terms forbid any caching or storage,
// so the response is never cached (Cache-Control: no-store) and nothing is kept server-side.
// Missing key or any Kakao failure returns { degraded: true } so the card keeps its fallback.
import cities from "../../../../src/_data/cities.json";
import { countStudyCafes } from "../../lib/kakao-client.mjs";

export async function onRequestGet({ params, env }) {
  const city = cities.find((c) => c.slug === params.slug);
  if (!city) {
    return Response.json({ error: "Unknown city" }, { status: 404 });
  }
  const result = await countStudyCafes(city, env);
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
