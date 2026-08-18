// Phase 8: mock endpoint, sourced from the Phase-1b mock JSON — not a live KTO call yet.
// Response shape (Gallery[], architecture.md §6/§5 detailImage2) is the exact drop-in target
// for the eventual live version.
import mockGallery from "../../../../src/_data/mock/gallery.json" with { type: "json" };
import { isValidSlug } from "../../lib/region-map.mjs";

export async function onRequestGet({ params }) {
  const { slug } = params;

  if (!isValidSlug(slug)) {
    return Response.json({ error: `Unknown region slug: ${slug}` }, { status: 404 });
  }

  const gallery = mockGallery.filter((g) => g.regionSlug === slug);
  return Response.json(gallery);
}
