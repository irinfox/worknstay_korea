// Verification — exercises kto-client.mjs against the real live API (contributes to
// the contest's call-history log) plus a forced-failure case. Run with:
//   node --env-file=.env scripts/verify-kto-client.mjs
import { fetchKto, fetchKtoAllPages } from "../functions/api/lib/kto-client.mjs";

const env = { KTO_API_KEY: process.env.KTO_API_KEY };
let failures = 0;

function check(label, condition, detail) {
  const pass = Boolean(condition);
  console.log(`${pass ? "PASS" : "FAIL"} — ${label}${detail ? ` (${detail})` : ""}`);
  if (!pass) failures += 1;
}

const attractions = await fetchKto(
  "areaBasedList2",
  { contentTypeId: 76, lDongRegnCd: "11", numOfRows: 5, pageNo: 1 },
  env
);
check(
  "live areaBasedList2 (Seoul, contentTypeId 76) returns non-degraded, non-empty",
  !attractions.degraded && attractions.items.length > 0,
  `degraded=${attractions.degraded} items=${attractions.items.length} totalCount=${attractions.totalCount}`
);

const jejuFestivals = await fetchKto(
  "searchFestival2",
  { lDongRegnCd: "50", eventStartDate: "20260101", numOfRows: 10, pageNo: 1 },
  env
);
check(
  "live searchFestival2 (Jeju) returns non-degraded with items as a real array (zero-result string guard)",
  !jejuFestivals.degraded && Array.isArray(jejuFestivals.items),
  `degraded=${jejuFestivals.degraded} items=${jejuFestivals.items.length}`
);

const badKey = await fetchKto(
  "areaBasedList2",
  { contentTypeId: 76, lDongRegnCd: "11", numOfRows: 5, pageNo: 1 },
  { KTO_API_KEY: "not-a-real-key" }
);
check(
  "forced-failure (bad key) degrades cleanly instead of throwing",
  badKey.degraded === true && Array.isArray(badKey.items) && badKey.items.length === 0
);

const missingKey = await fetchKto("areaBasedList2", { contentTypeId: 76, lDongRegnCd: "11" }, {});
check(
  "forced-failure (missing key) degrades cleanly instead of throwing",
  missingKey.degraded === true && missingKey.items.length === 0
);

const paged = await fetchKtoAllPages(
  "areaBasedList2",
  { contentTypeId: 76, lDongRegnCd: "41" },
  env,
  { numOfRows: 10, maxPages: 2 }
);
check(
  "fetchKtoAllPages (Gyeonggi-do) pages without degrading",
  !paged.degraded && paged.items.length > 0,
  `items=${paged.items.length} totalCount=${paged.totalCount}`
);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
