// Phase 8: mock endpoint, sourced from the Phase-1b mock JSON — not a live KTO call yet.
// Response shape (Event[], architecture.md §6) is the exact drop-in target for the eventual
// live version. Some regions (e.g. jeju-do) legitimately return an empty array — that's the
// designed empty state (CLAUDE.md rule 5), not a bug.
import mockEvents from "../../../../src/_data/mock/events.json";
import { isValidSlug } from "../../lib/region-map.mjs";

export async function onRequestGet({ params }) {
  const { slug } = params;

  if (!isValidSlug(slug)) {
    return Response.json({ error: `Unknown region slug: ${slug}` }, { status: 404 });
  }

  const events = mockEvents.filter((e) => e.regionSlug === slug);
  return Response.json(events);
}
