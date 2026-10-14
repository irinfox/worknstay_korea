// (lDongRegnCd, lDongSignguCd) -> city slug, derived from cities.json's ktoLDongRegnCd/ktoLDongSignguCds[] rather than
// duplicating the code lists here. Cities without KTO codes are skipped, so their attractions
// resolve to no city match.
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
// merged region "12" — each is just another entry in the array.
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
