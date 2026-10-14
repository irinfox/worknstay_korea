// lDongRegnCd <-> region-slug mapping (ARCHITECTURE.md). Derived directly from
// regions.json (the hand-authored editorial source of truth for region codes) rather than
// duplicating the code lists here, so the two can never drift out of sync.
import regions from "../../../src/_data/regions.json";

export const REGION_SLUGS = regions.map((r) => r.slug);

const lDongToSlug = new Map();
for (const region of regions) {
  for (const code of region.ktoLDongRegnCds) {
    lDongToSlug.set(code, region.slug);
  }
}

export function isValidSlug(slug) {
  return REGION_SLUGS.includes(slug);
}

export function slugToLDongRegnCds(slug) {
  return regions.find((r) => r.slug === slug)?.ktoLDongRegnCds ?? [];
}

// areacode is empty on festival records (ARCHITECTURE.md) — this is why lDongRegnCd is the
// canonical lookup key, never areacode.
export function lDongRegnCdToSlug(code) {
  return lDongToSlug.get(code) ?? null;
}
