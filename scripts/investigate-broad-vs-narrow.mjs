// One-off investigation for notes/attraction-gallery-report.md ("Real per-code catalog sizes"). Not
// a standing verify script. Pulls real `totalCount` (numOfRows: 1 — cheap, reflects the full result
// set regardless of numOfRows, and costs the same one call as any other numOfRows) for the 3 broad
// lclsSystm1 buckets (NA/VE/HS) across every lDongRegnCd code the site's 6 regions own, to check
// whether a single flat numOfRows constant is reasonable across NA/VE/HS or whether each bucket
// needs its own threshold.
//
// Run with: node --env-file=.env scripts/investigate-broad-vs-narrow.mjs
import { fetchKto } from "../functions/api/lib/kto-client.mjs";
import regions from "../src/_data/regions.json" with { type: "json" };

const env = { KTO_API_KEY: process.env.KTO_API_KEY };
const BROAD = ["NA", "VE", "HS"];

const rows = [];
for (const region of regions) {
  for (const code of region.ktoLDongRegnCds) {
    for (const lclsSystm1 of BROAD) {
      const r = await fetchKto("areaBasedList2", { lDongRegnCd: code, lclsSystm1, numOfRows: 1, pageNo: 1 }, env);
      rows.push({ region: region.slug, code, lclsSystm1, totalCount: r.degraded ? null : r.totalCount, quotaExceeded: r.quotaExceeded });
    }
  }
}

console.log("region".padEnd(16), "code".padEnd(8), "NA".padEnd(6), "VE".padEnd(6), "HS");
const byCode = new Map();
for (const r of rows) {
  const key = `${r.region}|${r.code}`;
  if (!byCode.has(key)) byCode.set(key, {});
  byCode.get(key)[r.lclsSystm1] = r.quotaExceeded ? "QUOTA" : r.totalCount ?? "DEGRADED";
}
const maxByCat = { NA: 0, VE: 0, HS: 0 };
for (const [key, vals] of byCode) {
  const [region, code] = key.split("|");
  console.log(region.padEnd(16), code.padEnd(8), String(vals.NA).padEnd(6), String(vals.VE).padEnd(6), String(vals.HS));
  for (const cat of BROAD) if (typeof vals[cat] === "number") maxByCat[cat] = Math.max(maxByCat[cat], vals[cat]);
}
console.log("\nMax totalCount observed per category across all codes:", JSON.stringify(maxByCat));
console.log(`Total probe calls made: ${rows.length}`);
