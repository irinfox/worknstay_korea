# Attraction gallery — KTO API usage report

## 1. Why every fetch is live (contest compliance)

KTO's compliance team confirmed any server-side caching — even a short TTL — needs a separate
approval form (3–5 day review, too slow before the deadline). Their review method checks the
**API-key call-history log**, not live site traffic, and a Cloudflare edge-cache hit
(`cf.cacheTtl`) would show as a gap in that log during the dev-period audit window
(2026-07-27–09-21). So production caching is disabled; every region-page view is a real,
uncached `areaBasedList2` call. A dev-only in-memory cache (`KTO_DEV_CACHE=1`) exists purely to
stop manual QA from burning quota — never enabled in production.

Two related rejections, logged here since they inform the numbers below:
- **Pure build-time-fetch-and-commit** — rejected outright. The contest FAQ discourages
  "로컬 DB 저장 방식" (local DB storage), and judges specifically check ongoing call history, not a
  one-time scrape.
- **`locationBasedList2` as a quota-exhausted fallback** — rejected. No clean single-circle
  lat/lng+radius coverage for multi-province regions, unconfirmed `lclsSystm` filter support, and
  `topAttractions.json` already covers the same scenario with zero new endpoint risk.

## 2. Historical background: why `arrange=P` and a curated whitelist

- The feed originally used `arrange=Q` (KTO's documented code, modified-date) — this surfaces
  whatever a KTO editor last touched, not popular landmarks. Switched to the undocumented but stable
 `arrange=P` (real view-count order).
- Even under the correct sort, a live measurement on Seoul (`lDongRegnCd 11`, `contentTypeId 76`)
  found **455 total records**, with Gyeongbokgung Palace ranking **#32** by view count — a naive
  "just take the top N" cut would still miss it. This is why curated picks are boosted into live
  results (`boost-curated.mjs`, `topAttractions.json`, ARCHITECTURE.md §5) rather than trusting
  the algorithmic sort alone, and why "broadening the query" (below) needed real per-item
  verification, not just a totalCount comparison, before trusting it wouldn't reintroduce the same
  crowding problem.
- A blacklist approach (excluding medical-tourism venues, shoe-repair streets, etc. by
  `cat3`/name-regex) was tried and abandoned in favor of the current whitelist model
  (`lclsSystm1/2/3`-scoped queries + curated boost) — a blacklist can only ever chase known junk
  categories, never add back a missed landmark.

## 3. Query shape: narrow (shipped) vs broad (proposed, not yet implemented)

**7 narrow `areaBasedList2` calls per `lDongRegnCd` code**, one call per content sub-category:

| # | category | KTO scoping |
|---|---|---|
| 1 | nature | `lclsSystm1=NA` (all of it) |
| 2 | nature | `lclsSystm2=VE03` (river/lake parks) |
| 3 | culture | `lclsSystm2=HS01` (historical sites) |
| 4 | culture | `lclsSystm2=HS03, lclsSystm3=HS030100` (temples only) |
| 5 | culture | `lclsSystm2=VE01` |
| 6 | culture | `lclsSystm2=VE04` |
| 7 | culture | `lclsSystm2=VE07` (whitelisted sub-codes only) |

**Broad shape: 3 calls per code** — `lclsSystm1=NA`, `=VE`, `=HS` — each unfiltered by
KTO, then reclassified client-side into the exact same wanted sub-codes after the fetch (same
editorial whitelist, applied post-fetch instead of via the query).

Calls are **per `lDongRegnCd` code**, not per region — a region's total is `(7 or 3) × its code
count`. Real per-region totals:

| region | codes | narrow total | broad total | saved |
|---|---|---|---|---|
| gyeonggi-do | 3 | 21 | 9 | 12 |
| gangwon-do | 1 | 7 | 3 | 4 |
| chungcheong-do | 4 | 28 | 12 | 16 |
| gyeongsang-do | 5 | 35 | 15 | 20 |
| jeolla-do | 2 | 14 | 6 | 8 |
| jeju-do | 1 | 7 | 3 | 4 |

(Excludes the separate +1 pre-flight probe call — unaffected by narrow/broad.)

**Two axes that looked promising but aren't real options:**
- **Combining multiple `lDongRegnCd` codes into one call** — tested live: a call with
  `lDongRegnCd: "11,28"` returned `totalCount: 0` with no error, i.e. KTO treats a comma-joined
  value as an unmatched code, not "either of these." One call per code is a hard KTO constraint,
  confirmed empirically, not an implementation choice.
- **Dropping some of a region's codes from the live fan-out** — considered, then rejected: every
  code a region owns is load-bearing, belonging either to the region itself or to a metropolitan
  city inside it. There's no discretionary subset to cut.

## 4. Real per-code catalog sizes (`totalCount`, `numOfRows: 1` probes)

All 16 `lDongRegnCd` codes across the 6 regions, broad buckets only (48 calls,
`scripts/investigate-broad-vs-narrow.mjs`):

| region | code | NA | VE | HS |
|---|---|---|---|---|
| gyeonggi-do | 11 | 27 | 244 | 45 |
| gyeonggi-do | 28 | 31 | 58 | 14 |
| gyeonggi-do | 41 | 69 | 135 | 58 |
| gangwon-do | 51 | 134 | 109 | 49 |
| chungcheong-do | 30 | 10 | 28 | 3 |
| chungcheong-do | 36110 | 4 | 12 | 6 |
| chungcheong-do | 43 | 36 | 37 | 19 |
| chungcheong-do | 44 | 62 | 34 | 50 |
| gyeongsang-do | 26 | 23 | 70 | 9 |
| gyeongsang-do | 27 | 10 | 40 | 19 |
| gyeongsang-do | 31 | 16 | 17 | 4 |
| gyeongsang-do | 47 | 82 | 89 | 71 |
| gyeongsang-do | 48 | 63 | 55 | 36 |
| jeolla-do | 12 | 94 | 123 | 59 |
| jeolla-do | 52 | 37 | 43 | 28 |
| jeju-do | 50 | 91 | 55 | 9 |
| **max observed** | | **134** | **244** | **71** |

**Why this matters for picking `numOfRows` on a broad call:** `numOfRows` costs zero extra API
quota — KTO returns `min(totalCount, numOfRows)` for the same one call regardless of the value
requested, and response payload at these sizes (a few hundred KB at most) is not a real cost
either. So there's no reason to fine-tune three separate per-category constants against the
"typical" numbers above — just pick one flat value comfortably above the largest ceiling seen
anywhere (244, on VE) with headroom, e.g. **250**, and every category on every code is covered in
one call. Three tuned constants would add maintenance burden for a saving that isn't actually
being spent on anything.

## 5. Narrow vs broad — does broadening actually lose curated content? (case study)

Concern going in: broadening pulls in KTO sub-codes with zero curation history (not just widening
already-capped narrow buckets) — e.g. broad VE on code `11` is `totalCount: 244`, well above the
sum of today's four narrow VE0x buckets' real totals (45+11+31+85=172) — so `arrange=P`'s
view-count sort could in principle bury curated picks under previously-unseen high-view-count
junk, the same failure mode §2 recorded for Seoul. Tested against real items (not just
`totalCount`), replaying the actual production filters (content-type allowlist, per-group
whitelist, image-required) plus the broad-mode reclassification, `numOfRows: 30` narrow /
`numOfRows: 150` broad (matching `ROWS_PER_GROUP` and the original broad proposal):

**Code `11` (gyeonggi-do), 10 curated picks for this region:**

| mode | calls | unique items after filtration | curated picks present |
|---|---|---|---|
| narrow | 7 | 124 | 3 of 10 |
| broad | 3 | 139 | 3 of 10 |

**Code `26` (gyeongsang-do), 12 curated picks for this region:**

| mode | calls | unique items after filtration | curated picks present |
|---|---|---|---|
| narrow | 7 | 54 | 4 of 12 |
| broad | 3 | 54 | 4 of 12 |

Result: broad matched narrow's curated-pick presence exactly on both codes, and surfaced *more*
usable content on the high-volume code despite pooling from unfiltered sub-buckets — pooling
across categories beats narrow's fixed 30-row cap per bucket, which was already losing content on
`11` today (VE03, HS01, VE07 all exceed 30 real results there). Concern not borne out on this
sample.

**Row-count sensitivity** (broad VE, code `11`, catalog 244 — the one bucket that truncates at
150 rows):

| `numOfRows` | fetched | after filtration | curated picks matched |
|---|---|---|---|
| 100 | 100 | 61 | 1 of 1 |
| 150 | 150 | 86 | 1 of 1 |
| 200 | 200 | 105 | 1 of 1 |
| 250 (full catalog) | 244 | 111 | 1 of 1 |

Curated-pick presence didn't change at any row count tested — only algorithmic variety scales with
it, reinforcing §4's recommendation (250 is safe, no quota cost either way).

## 6. Visitor-cost estimate

Calls for one page view per region, all 6 regions once each (one full site exploration):

| shape | gyeonggi-do | gangwon-do | chungcheong-do | gyeongsang-do | jeolla-do | jeju-do | **total** |
|---|---|---|---|---|---|---|---|
| narrow + separate probe | 22 | 8 | 29 | 36 | 15 | 8 | **118** |
| broad + separate probe | 10 | 4 | 13 | 16 | 7 | 4 | **54** |
| broad + folded-in probe (both fixes) | 9 | 3 | 12 | 15 | 6 | 3 | **48** |

Against the dev key's 1,000/day cap (`areaBasedList2`/`searchFestival2` quotas are
independent — this covers `areaBasedList2` only): **118 calls/exploration supports 8
full-site visits/day today; 48 calls/exploration (broad collapse + probe fold-in together)
supports 20** — a 2.5x increase in how many visitors the live site can actually serve per day
on the same key. The production key will not be ready before launch, so the site ships on this
dev-key quota — this headroom is directly load-bearing capacity, not a dev-testing convenience.

## 7. Final checks on the shipped broad collapse

One live pass across all 6 regions (`scripts/investigate-final-checks.mjs`, 48 calls — the same
"one full site exploration" §6 already budgeted as safe) exercised the shipped
`fetchRegionAttractions` (`functions/api/lib/attraction-fetch.mjs`) end to end. `arrange=P`
worked on every region's probe — no fallback-arrange call was needed anywhere.

**Check 1 — curated top-pick presence / injection:**

| region | live items | curated picks | present in live | injected by boost | soft dropped (not injected) |
|---|---|---|---|---|---|
| gyeonggi-do | 346 | 10 | 9 | 1 | 0 |
| gangwon-do | 174 | 10 | 9 | 1 | 0 |
| chungcheong-do | 177 | 6 | 6 | 0 | 0 |
| gyeongsang-do | 336 | 12 | 11 | 1 | 0 |
| jeolla-do | 225 | 10 | 7 | 3 | 0 |
| jeju-do | 93 | 6 | 4 | 1 | 1 |

Every region's live broad fetch already surfaces most of the curated list on its own —
`boost-curated.mjs` only has to inject 1-3 `hard` picks per region (0 for chungcheong-do), and
exactly one `soft` pick (jeju-do) is quietly dropped rather than injected, as designed.

**Check 2 — empty filter combinations** (every named-city pill × Area/Type, per `region.njk`'s
`cityOrder`, plus "Elsewhere"): only 2 of 6×5×2 combinations come back empty, both jeju-do's
"Elsewhere" bucket (nature and culture). Jeju-do's single `lDongRegnCd` code is fully covered by
its two named cities (jeju-city/seogwipo), so an empty "Elsewhere" there is structurally
expected, not a gap. The narrow-shape empty combos flagged before this phase (Seongnam,
Cheongju — empty on nature or culture) no longer reproduce: the broad collapse's pooled,
unfiltered-then-reclassified fetch resolved them as a side effect, not a targeted fix.

