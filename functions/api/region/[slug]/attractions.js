// Phase 8: mock endpoint, sourced from the Phase-1b mock JSON — not a live KTO call yet.
// Response shape (Attraction[], architecture.md §6) is the exact drop-in target for the
// eventual live version, so swapping the body to a real kto-client.mjs/normalize.mjs call later
// needs no change on the calling side.
import mockAttractions from "../../../../src/_data/mock/attractions.json" with { type: "json" };
import { isValidSlug } from "../../lib/region-map.mjs";

export async function onRequestGet({ params }) {
  const { slug } = params;

  if (!isValidSlug(slug)) {
    return Response.json({ error: `Unknown region slug: ${slug}` }, { status: 404 });
  }

  const attractions = mockAttractions.filter((a) => a.regionSlug === slug);
  return Response.json(attractions);
}
