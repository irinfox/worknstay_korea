// (lDongRegnCd, lDongSignguCd) -> city slug (architecture.md §5's confirmed city-level KTO
// filter pair), derived from cities.json's ktoLDongRegnCd/ktoLDongSignguCds[] rather than
// duplicating the code lists here. A handful of cities (currently 7 — paju, ganghwa, yangyang,
// goseong-gangwon, boryeong, andong, tongyeong) don't carry KTO codes yet and are skipped, so
// their attractions resolve to no city match until those codes are sourced.
import cities from "../../../src/_data/cities.json";

const byRegnCd = new Map();
for (const city of cities) {
  if (!city.ktoLDongRegnCd) continue;
  const list = byRegnCd.get(city.ktoLDongRegnCd) || [];
  list.push(city);
  byRegnCd.set(city.ktoLDongRegnCd, list);
}

// Empty ktoLDongSignguCds means the city IS its whole lDongRegnCd (the metro cities — Seoul,
// Incheon, Daejeon, Sejong, Busan, Daegu, Ulsan) — only match that as a fallback, after every
// specific-signgu city has had a chance to match. Gwangju fans out across 5 signgu codes inside
// merged region "12" (architecture.md §5) — each is just another entry in the array.
export function citySlugFor(lDongRegnCd, lDongSignguCd) {
  const candidates = byRegnCd.get(lDongRegnCd);
  if (!candidates) return null;
  const specific = candidates.find(
    (c) => c.ktoLDongSignguCds.length && c.ktoLDongSignguCds.includes(lDongSignguCd)
  );
  if (specific) return specific.slug;
  const whole = candidates.find((c) => c.ktoLDongSignguCds.length === 0);
  return whole ? whole.slug : null;
}
