# Gallery/quota compliance pass — full plan

Status: **implemented 2026-09-16** (§6 events used `eventsSnapshot.json`, not `curatedEvents.json`
— it's a point-in-time capture, not an ongoing curated set; attractions data is
`topAttractions.json`, not `curatedAttractions.json`). Written 2026-09-15 after KTO confirmed any
caching (even short-TTL) needs a separate approval form with a 3-5 day review — too slow before
the deadline. Tracked tersely as `ROADMAP_TODO.md` Phase 25; this file has the reasoning and
exact implementation detail a fresh session needs to execute without re-deriving it.

## Context

KTO's compliance team's answer stayed generic about "로컬 DB 저장 방식" (local DB/server storage)
needing the form rather than clearly exempting short-TTL caching, and their own review method
checks the applicant's **API-key call-history log**, not live site traffic. Reading: our
Cloudflare edge cache (`cf.cacheTtl`) has to go in production — it can leave gaps in that log
during cache-hit windows. A visitor's own browser storage, or a cache that only ever runs in
local dev, never touch what gets audited, so those stay available tools.

Losing server-side caching means every page view now costs real, uncached KTO calls, so this pass
also covers reducing/bounding that cost, finishing the "Elsewhere" filter tab (Phase 24 leftover),
boosting curated picks into the live gallery so trustworthy landmarks reliably show up early (the
exact problem `notes/attraction-feed-curation.md` flagged and left unsolved back in August), and
cleaning up the `mock/` folder now that `attractions.json` is real, verified, production-facing
data rather than a placeholder.

`areaBasedList2`'s daily quota was confirmed exhausted during planning (`returnReasonCode: "22"`)
— **no step below that needs a live `areaBasedList2` call should run until it resets.**

---

## 1. Remove production caching (do first)

**Files:** `functions/api/region/[slug]/attractions.js`, `functions/api/region/[slug]/events.js`

Comment out just the `cacheTtl` key in each file's `fetchKtoAllPages(...)` options object (leave
the `CACHE_TTL_SECONDS` constant defined), with a comment explaining why and that it's a one-line
uncomment once KTO approves the form:

```js
{ numOfRows: ROWS_PER_GROUP, maxPages: 1 /*, cacheTtl: CACHE_TTL_SECONDS — disabled 2026-09,
  KTO requires a separate approval form for any caching (3-5 day review, too slow for the
  deadline); uncomment once approved */ }
```

**File:** `architecture.md` §5 — the pipeline diagram's `Cloudflare edge cache (cf.cacheTtl)`
line and the "Rate-limit note" paragraph (currently claims caching keeps round-trips to "~one per
TTL window... not one per visitor") are now false in production. Update both to state caching is
disabled pending KTO approval, every visit is a live call, and point at the quota math in §2.

---

## 2. Call-volume: fix the retry's shape (not remove it), investigate broadening later

**Do now — replace the reactive full-fan-out retry with a cheap pre-flight probe, so the fan-out
only ever runs once.** Today's flow pays for the *entire* fan-out with `ARRANGE = "P"`, checks
afterward whether the whole region came back empty, and if so pays for the *entire* fan-out again
with `FALLBACK_ARRANGE = "R"` — worst case, a full double-pay (e.g. gyeongsang-do 70 calls). The
safety net is worth keeping (rare, but if KTO ever drops the undocumented `P` sort, this stops
attractions from silently vanishing) — the problem is *when* the check happens, not that it
happens.

Fix: one minimal probe call *before* the real fan-out, against a single region code with a broad,
essentially-never-sparse category (no `lclsSystm` narrowing, or just `lclsSystm1: "VE"`),
`numOfRows: 1`. If it returns anything, run the full fan-out with `ARRANGE` as today (same cost as
now — the probe is the only addition). If it comes back genuinely empty (and not quota-caused),
run the full fan-out once with `FALLBACK_ARRANGE` instead — never both. Net cost: **+1 call on
every page load** (small — e.g. +1 on gyeonggi-do's 21), in exchange for **eliminating the
worst-case double-pay entirely** (gyeongsang-do worst case 70→36). A per-*group* check (after the
first group call, not a dedicated probe) would be wrong — a single narrow group legitimately
returning zero is normal/expected sparsity (documented elsewhere in `attractions.js` — most
`lclsSystm3` sub-codes are legitimately sparse for a given region), not a signal `P` is broken;
only a broad, whole-region-level probe is a reliable signal.

**File:** `functions/api/region/[slug]/attractions.js` — replace the current
`if (items.length === 0 && !quotaExceeded) { retry with FALLBACK_ARRANGE }` block with a
`pickWorkingArrange(firstCode, env)` helper (one `fetchKto` call, no grouping) called once per
request, before `fetchRegionAttractions` runs; pass its resolved arrange into the one real
fan-out call instead of hardcoding `ARRANGE`.

**Deferred — investigate broad-vs-narrow queries once `areaBasedList2`'s quota resets.** Current
state: 7 narrow calls per `lDongRegnCd` code (`NATURE_GROUPS` = 2: `lclsSystm1: "NA"`,
`lclsSystm2: "VE03"`; `CULTURE_GROUPS` = 5: `HS01`, `HS03`+whitelist, `VE01`, `VE04`,
`VE07`+whitelist). Proposed: collapse to 3 broad calls per code (`lclsSystm1: "NA"`, `"VE"`,
`"HS"` — note broad `"VE"` subsumes today's separate `VE03` nature call too, so this is 7→3, not
7→4), each with a higher `numOfRows` (proposed ~150 for the whole region), classifying/whitelisting
client- or server-side from the already-fetched raw `lclsSystm2`/`lclsSystm3` fields — no extra
call needed for that step. 57% fewer calls in the best case (gyeongsang-do 35→15).

Before committing to this, run the real-number check attempted during planning and blocked by the
exhausted quota:
- For 1-2 representative codes (e.g. Seoul `"11"`, Busan `"26"`), pull `totalCount` (via
  `numOfRows: 1`, cheap — `totalCount` is the full result-set size regardless of `numOfRows`) for
  each of today's 7 narrow groups AND each of the 3 proposed broad groups.
- Tells us: (a) whether any narrow group is already near/over its 30-row cap today (if not,
  broadening changes nothing about what's missed), and (b) whether a broad group's `totalCount` is
  small enough that one `numOfRows: 150` call genuinely captures everything, or still needs
  pagination.
- `notes/attraction-feed-curation.md` (2026-08-28, pre-`lclsSystm` migration) already recorded
  Seoul has ~455 total `contentTypeId: 76` records region-wide and that famous landmarks like
  Gyeongbokgung ranked as low as #32 under the old scheme — real evidence broadening carries some
  risk of crowding out landmarks from a top-30/top-150 cut. **This risk is substantially mitigated
  by §5 below** — a `hard`-priority curated pick is guaranteed to appear (injected if the live
  query misses it entirely), so broadening no longer risks losing the landmarks that actually
  matter, only some algorithmic-filler variety.

Not pursuing right now (flagged, not decided): trimming which `lDongRegnCd` codes get queried live
per region (biggest cut, permanent loss of live discovery for dropped codes) — hold until real
traffic patterns justify it. Scroll-triggered "load next page" pagination (raised during planning)
is a good future feature for exposing more than today's 30-per-category cap to an engaged visitor,
but it's orthogonal to this problem — it only adds calls when someone scrolls deep, it doesn't
reduce the up-front per-load cost, so it's not part of this pass.

---

## 3. Dev-time quota protection

**a. Filter-logic QA needs zero live calls — no code, just a habit.** Confirmed:
`attractions.js`'s no-`KTO_API_KEY` branch returns the identical `{ items, quotaExceeded }` shape
the live branch does, and `region-data.js`'s `renderAttractions()`/`applyAttractionFilters()`
don't branch on live-vs-mock at all. So testing Area/Type filter pills only needs `KTO_API_KEY`
unset in `.dev.vars` — zero API cost, exercises the exact same render path. Add one bullet to
`CLAUDE.md`'s "Workflow constraints" documenting this.

**b. Dev-only in-memory cache, for when live data specifically needs checking.**
**File:** `functions/api/lib/kto-client.mjs` — inside `fetchKto`, gate on
`env?.KTO_DEV_CACHE === "1"` (set only in `.dev.vars`, never in Cloudflare's production env —
`wrangler.jsonc` has no `vars` block, production vars live only in the dashboard, so this can
never leak into production by any path in this repo). A plain module-level `Map` keyed by the
built request URL, ~15 min TTL, no persistence. Only cache **successful, non-degraded, non-quota**
results — a quota-exceeded response should never be cached, so repeated checks keep reflecting
real quota state. Log a distinct `[kto-client] dev cache hit` line (separate from the existing
`devSessionCallCount` logging, since a cache hit isn't a network attempt).

**Verification:** optional `scripts/verify-kto-dev-cache.mjs` (house style — see
`verify-kto-client.mjs`), stubbing `globalThis.fetch` with a call-counting fake, asserting two
identical calls with `KTO_DEV_CACHE=1` hit the fake once.

---

## 4. Real "Elsewhere" filter tab

**File:** `src/assets/js/attraction-filters.js`

Replace the current short-circuit (`area === "elsewhere"` behaving identically to `"all"`) with
real logic: "Elsewhere" means a card's `data-city` is either empty OR set to a citySlug that isn't
one of the Area pills actually rendered on the page (e.g. Goyang's cards on gyeonggi-do — resolved
to a real citySlug but deliberately has no pill).

```js
function knownAreaSlugs(areaPills) {
  return new Set(areaPills.map((p) => p.dataset.filterValue).filter((v) => v !== "all" && v !== "elsewhere"));
}
// in applyFilters():
const knownAreas = knownAreaSlugs(areaPills);
const matchesArea =
  area === "all" || (area === "elsewhere" ? !knownAreas.has(card.dataset.city) : card.dataset.city === area);
```

Derived live from the rendered DOM (not hardcoded), so it stays correct if `cityOrder` in
`region.njk` ever changes. Update the module's header comment and `ROADMAP_TODO.md` Phase 24's
matching bullet once done.

Zero new API calls, ~8-line change, zero CSS, zero loading-time impact.

**Verify:** `npm run build && npm run pages:dev` (rebuild before re-checking — `pages:dev` doesn't
watch files), load a region page, click "Elsewhere," confirm only unmatched/unlisted-city cards
show.

---

## 5. Boost curated picks into live results

**Priority semantics (confirmed with user):**
- **`hard`** — must appear somewhere in the first ~3 scroll-pages. If missing from live results,
  **inject** the curated record directly.
- **`soft`** — only boosted if it's *already* present in live results (repositioned earlier); if
  absent, it's simply **not added** — no injection.

**Card-width math** (from `region-page.css`): mobile cards 210px + 12px gap ≈ 222px/card, ~1-2
visible per swipe at 360px → 3 pages ≈ 4-5 cards (the binding constraint). Desktop cards 240px +
12px ≈ 252px/card → 3 pages ≈ 13-15 cards. Boosting at positions **0, 2, 5, 7, 10, …** (alternating
+2/+3 from 0) puts the first two picks well inside the mobile budget and keeps spreading through
the larger desktop one — matches the "every 2nd/3rd, starting with 1st" spacing.

**New field — curated attractions data (see §6 for the rename):** restore a
`priority: "hard" | "soft"` field, sourced from `sightsee_top_upd.tsv`'s existing `Priority`
column (still on disk, `hard`/`soft` values already present per row).

**New file:** `functions/api/lib/boost-curated.mjs` — pure function
`boostCuratedPicks(liveItems, curatedItems)`, operating **per-category bucket** (nature/culture
split independently, then recombined) so it runs *before* `attractions.js`'s existing
`CATEGORY_PRIORITY` sort and that sort's stability preserves the interleave:

1. Split `curatedItems` into `hard` and `soft`.
2. For each `hard` pick: if its `contentId` is in the live bucket, mark it for repositioning
   (keep the live object — fresher `sourceModifiedAt`); if absent, inject the curated object
   directly.
3. For each `soft` pick: if present in the live bucket, mark for repositioning; if absent, skip
   entirely (no injection).
4. Build the boosted bucket: `hard` results first (guaranteed placement), then `soft` results,
   interleaved into the remaining live items at the 0/2/5/7/10… position scheme.
5. Recombine nature + culture buckets, in the same order `attractions.js` already emits them.

**File touched:** `functions/api/region/[slug]/attractions.js` — call
`items = boostCuratedPicks(items, curatedAttractions.filter(a => a.regionSlug === slug))` right
after the live-fetch/fallback block, guarded by `if (!quotaExceeded)` (the quota-fallback branch is
already the full curated set — boosting against itself is pointless).

Zero new API calls, negligible compute (array ops over ~50-100 items), zero loading-time impact.

**New verify script:** `scripts/verify-boost-curated.mjs` (house style, see
`verify-normalize.mjs`) — fixtures testing: position 0 is always a hard pick when any exist;
live-version-wins-on-conflict; hard-pick injected when absent; soft-pick omitted (not injected)
when absent; category isolation (a curated nature pick never lands in the culture bucket).

---

## 6. Rename `src/_data/mock/` — attractions now, events after re-sourcing

**`src/_data/mock/attractions.json` → `src/_data/curatedAttractions.json`** (flat, matching
`regions.json`/`cities.json`/`visaRules.json`'s existing style — no new subfolder for one file).
This data is real, hand-verified, KTO-licensed content (built via a `detailCommon2`/
`detailImage2` curation pass, contentIds cross-checked against `sightsee_top_upd.tsv`) —
CLAUDE.md rule 4's `MOCK`/`PLACEHOLDER` convention is for content that still needs real sourcing,
which this isn't. Only reference to update: `functions/api/region/[slug]/attractions.js:14`
(import path + local variable/comments renamed from "mock" to "curated"). Do this in the same
edit pass as §5 since both touch that import line.

**`src/_data/mock/events.json` — replace its content with real data (no quota fallback for
festivals, but a real example set for the no-key dev path).** Confirmed: the current file has
literal `"MOCK — 031-000-0000"` phone numbers and `imageUrl` paths under
`/assets/img/mock/events/` that don't exist anywhere on disk — genuine placeholder data, not
usable even as a dev-fallback example. Needs a small live-data curation pass (similar structure to
the attractions one): pick a handful of real, currently-listed festivals per region via
`searchFestival2`/`detailCommon2`, shape them to match `normalizeEvent()`'s actual output
(`contentId, regionSlug, lDongRegnCd, titleEn, titleKo, startDate, endDate, address, imageUrl,
imageLicense, tel, homepageUrl`) — i.e. what the live API response genuinely looks like today, not
invented copy. Once sourced, rename alongside: `src/_data/curatedEvents.json`, update
`events.js:8`'s import. This file serves **only** the no-`KTO_API_KEY` dev-fallback path — no
`quotaExceeded` fallback is being added for events, since that would need this re-sourcing done
first regardless and isn't being built now.

This re-sourcing pass needs its own live KTO calls (`searchFestival2` + a few `detailCommon2`
lookups) — check quota availability before running it; separate from anything else in this plan.

---

## 7. `locationBasedList2` as a second-tier fallback — rejected

Not building this. Reasoning: needs real lat/lng + radius per query, and multi-province regions
(gyeongsang-do, chungcheong-do) have no clean single-circle coverage; unconfirmed whether it
supports the same `lclsSystm1/2/3` filtering (would cost calls just to test); it's a separate
daily-quota bucket so it would add real headroom in principle, but the curated fallback
(`curatedAttractions.json`, §6) already solves the exact "quota gone" scenario with zero new
endpoint risk and an honest "today's top picks" message.

**File:** `architecture.md` — add a new `## 11. Feedback log (approach decisions made and why)`
section (the file currently has none — §0 through §10 only):

```
## 11. Feedback log (approach decisions made and why)

- **`locationBasedList2` as a second-tier fallback when `areaBasedList2`'s daily quota is
  exhausted — rejected.** No clean single-circle lat/lng+radius coverage for multi-province
  regions; unconfirmed `lclsSystm` filter support; the curated fallback
  (`curatedAttractions.json`) already covers this scenario with an honest message and zero new
  endpoint risk.
```

---

## Execution order

1. §1 cache removal + §2's pre-flight-probe rework + `architecture.md` §5 update — smallest,
   most urgent (compliance).
2. §3 dev-cache + the `.dev.vars`-no-key habit — needed before touching §5 with live data.
3. §4 Elsewhere tab — independent, trivial, verify first.
4. §6 attractions rename + §5 boost feature together (same file, same import line).
5. §7 — pure documentation, any time.
6. §2's broad-vs-narrow investigation — once `areaBasedList2`'s quota resets; decide after real
   numbers are in, not before.
7. §6 events re-sourcing — separate live-curation pass, its own quota check first.

## Verification

- `npm run build` after every step touching templates/JS/data — rebuild before re-checking in
  `pages:dev` (doesn't watch files).
- New/updated verify scripts (`scripts/verify-kto-dev-cache.mjs`,
  `scripts/verify-boost-curated.mjs`) run standalone, no live KTO calls needed (stubbed fetch /
  pure fixtures).
- §4 and §5 checked live in `pages:dev` with `KTO_API_KEY` unset (curated fallback path — zero
  quota cost) before ever checking them against a live key.
- §2's investigation step is itself the verification for the broad-vs-narrow decision — no
  guessing, real `totalCount` numbers first.
