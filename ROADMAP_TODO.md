# Work&Stay Korea — Feature Roadmap TODO

Each phase = one day, one branch, one PR to main. Continues `SCAFFOLDING_TODO.md`'s numbering
(ends at Phase 10). Complete one phase, verify it, mark `[x]`, then start the next — don't batch
approval across phases.

Target: feature-complete ~2026-09-07 (hard deadline 2026-09-21 16:00 KST). Today: 2026-08-18.
18 phases, ~18 working days available — expect to use the priority table near the end.

No public URL until Phase 19 (deploy) — data → real map → calculator → map wiring first, per
explicit direction. `/regions/` index page was considered and **rejected** — regions are
navigable from the interactive map only. The map itself shows all 6 regions un-gated by default;
only after a calculator run do ineligible regions grey out (Phase 17).

---

## Phase 11 — Data truth: region codes
`regions.json`'s `ktoLDongRegnCds` are wrong for 3/6 regions — verified live against
`EngService2` (twice, independently).

| region | current | correct |
|---|---|---|
| gangwon-do | `["42"]` | `["51"]` — 42 returns 0 records |
| chungcheong-do | `["30","36","43","44"]` | `["30","36110","43","44"]` — Sejong is 5-digit |
| jeolla-do | `["29","45","46"]` | `["12","52"]` — 12 = merged Jeonnam+Gwangju, 52 = Jeonbuk |
| others | ok | ok |

- [x] Fix the codes above, comment that they're live-verified (2026-08-18).
- [x] Fill `visaRules.sourceUrl` (currently empty).
- Verify: live call per region returns `totalCount > 0`; `visaRules.sourceUrl` non-empty and
  resolves.

## Phase 12 — Data truth: population-decline areas
Blocks Phase 15 (`eligibility.js`'s `'partial'` tier).

- [x] Source real MOIS 인구감소지역 list into `populationDeclineAreas.json` (currently `[]`;
      ~89 counties reported, confirm against the actual MOIS notice, don't trust secondhand).
      Sourced 2026-08-18 directly from `mois.go.kr`, verified twice independently. Actually 107
      records nationwide (89 「인구감소지역」+ 18 「관심지역」, a separate watch-list — visa text is
      ambiguous whether watch counties qualify too, see Phase 29). Split into two files: the
      working `populationDeclineAreas.json` keeps only the 7 records inside `gyeonggi-do` (the
      only region where this data affects eligibility); `populationDeclineAreasFull.json` backs
      up all 107 so the scrape doesn't need repeating if scope changes.
- [x] Every `provinceSlug` must match a real `regions.json` slug.
- [x] Update `cities.json`'s `isPopulationDeclineArea` flags to match (Ganghwa is a likely `true`).
      Ganghwa → `true`. Gangneung/Gyeongju/Boryeong/Andong are MOIS-listed too but outside
      Gyeonggi-do, so left `false` (no eligibility effect there — see architecture.md §7).
- Verify: script-check every entry has real fields + valid `provinceSlug`.
      Working file: 7/7 valid, all `provinceSlug: 'gyeonggi-do'`. Full file: 107/107 valid, 89
      decline + 18 watch, no duplicate counties across the two lists. `cities.json` flags
      cross-checked against the working file (script run 2026-08-18).

## Phase 13 — Real Korea boundary SVG
No dependency on 11/12. Filename stays `korea-regions.svg` (`korea-map.njk` inlines it by that
exact name via the `inlineSvg` shortcode). Existing per-region structure to preserve — verified
directly against the current file, not just described:
```
<a href="/regions/<slug>/" class="region" data-slug="<slug>" aria-label="…">
  <g id="<svgGroupId from regions.json, e.g. region-gyeonggi — NOT region-<slug>-do>">
    <rect|ellipse class="region__shape" … />
    [<g class="region__subshape" aria-hidden="true">…</g> — Seoul/Incheon only]
    <text class="region__label" …>…</text>
  </g>
</a>
```
Root `<svg>` keeps `viewBox`, `role="group"`, `aria-label`, and a `<title>`. `data-slug` is what
Phase 17's `applyResult()` keys off — losing it here breaks Phase 17 silently. The ids are
*not* targeted by any CSS/JS today (only classes are); the real reason to preserve them exactly
is staying in sync with `regions.json`.

- [x] Simplify + group `source/korea-provinces-blank.svg`'s 17 shapes into the 6-group structure.
- [x] Re-derive `regions.json` centroids + the 6 leader-line coords in `index.njk`.
- [x] Position + fine-tune all labels (hover-scale-checked); full detail naming confirmed legible
      on a real Pixel 9 instead of a narrow-viewport summary fallback — see architecture.md §9.
- [x] Jeju's hit target padded to ≥44px at 360px via an invisible `.region__hit-target` ellipse.
- [x] **Budget: inlined SVG ≤60KB** — ~49.0KB.
- [x] Timebox: 1 day hard — used ~1.5 days (2026-08-19–21); no hand-drawn fallback needed.
- [x] Verify: `href`/`data-slug`/`id` match `regions.json` (script-checked); hit targets ≥44px at
  360px (script-checked); labels legible on a real Pixel 9.

## Phase 14 — Home page: hero + layout restructure
Template/CSS only, no JS. Loosely after Phase 13 so `index.njk` gets touched once.

- [x] Hero section with an image-slot (data-fed, placeholder gradient until a real photo exists).
      `partials/hero.njk` + `components/hero.css`.
- [x] Brief intro copy, calculator mount point (`#calculator`, `<noscript>` fallback to
      `/visa-info/`), result-caption mount point (`#eligibility-result`), existing map section
      below (unchanged).
- [x] Decide: hero photo — own vs. KTO-sourced. Chosen KTO-sourced ("Mungyeongsaejae Open Set",
      Type1/unrestricted); lives in `src/assets/img/hero/` with credit line + scrim/shadow tuned
      for legibility.
- [x] Narrow/wide viewport pass (real Pixel 9 + desktop devtools, plus DOM-simulated checks at
      412/900px) found and fixed several real bugs: `.hero__content` overflow, header/heading
      overlap, calculator field sizing and alignment at both mobile and ≥768px.
- Verify: build clean; map/leader-lines untouched by the restructure (diff-checked).

## Phase 15 — `eligibility.js`
Pure function, no DOM. Depends on Phase 12.

- [x] `(userInput, referenceData) → EligibilityResult` — `assets/js/eligibility.js`.
      `userInput = { salaryKrw, age, hasFamily }`, `referenceData = { rules, regions,
      populationDeclineAreas }`. Two-object shape, not flat args: `userInput` is also exactly
      what Phase 16 will serialize (form → sessionStorage → query-param permalink), so it
      doubles as that DTO. architecture.md §6 updated to match.
- [x] `'partial'` tier via `partialRegionSlugs[]`; global `tier` stays 3-way
      (`ineligible | nonCapitalOnly | all`), not a 4th tier.
- [x] Family input: boolean `hasFamily`.
- [x] Dropped `eligibility.js`'s scaffolding no-op `init()` and its `main.js` wiring — nothing
      calls it yet (Phase 16's `calculator.js` will call `calculateEligibility()` directly).
- [x] website-architect review: signature OK as-is; dropped `captionKey`, split `gapKrw` into
      `gapToNonCapitalKrw`/`gapToCapitalKrw`.
- [x] Data bug found in review: `visaRules.json` multiplied a rounded GNI instead of storing MOJ's published figures.
      Fixed via `thresholdsByMultiplier` — the 3 real figures, stored once, keyed by multiplier;
      `eligibility.js`/`visa-info.njk` look it up. Also renamed `familyMultiplier`'s fields to
      match `ageBands`' shape, removing the asymmetry that caused this.
- Verify: `node scripts/verify-eligibility.mjs` — 5/5 pass, now asserts real threshold values.

## Phase 16 — `calculator.js` + caption + persistence
Depends on 14 (mount points) + 15 (pure function). **Owns all caption rendering** — Phase 17
doesn't render captions, only applies map state.

- [x] Real `<form>` in `hero.njk` (hidden until JS reveals it), salary/age/family,
      `inputmode="numeric"`, 44px+ inputs, inline validation (salary ≥ 0, age ≥ 18, both
      required — an empty field must not silently read as salary/age 0).
- [x] `calculator.js` renders the 3 tier captions + partial-region note into `#eligibility-result`.
- [x] ~~`sessionStorage` write, read by a region-page badge~~ — removed, see Phase 18.
- [x] Query-param permalink: `?salaryKrw=&age=&hasFamily=` prefills + auto-computes on load,
      `history.replaceState` on submit. Reset control clears the form and the map together.
- [x] Gap message via `gapToNonCapitalKrw`/`gapToCapitalKrw`, not just pass/fail.
- [x] Reference data (`visaRules`/trimmed `regions`/`populationDeclineAreas`) embedded as a
      build-time JSON island (`_data/eligibilityReferenceData.js`) — no client fetch, no server.
- Verify: `node scripts/verify-calculator.mjs` — 7/7 pass (validation messages, incl. empty vs.
  `0`). Browser-tested all 3 tiers + permalink round-trip live; no console errors.

**Calculator works end to end here — map doesn't react yet.**

## Phase 17 — Map eligibility wiring (click-gating)
Depends on 13 (real shapes) + 16 (`EligibilityResult`).

- [x] `korea-map.js applyResult()` → `.region--active/--partial/--ineligible` classes; partial
      gets a hatched fill (new SVG `<pattern>`, ~0.9KB, still ~49.9KB of the 60KB cap) + tooltip.
- [x] Click-gating (href/`aria-disabled`) + restore path, same commit. Also gates each
      region-card's "Learn more →" link, not just the map shape — otherwise the callout
      bypasses the map's gating. No in-card eligibility text (~~tried, dropped~~) — the map
      legend and the calculator's own caption cover it instead.
- [x] `main.js` glue via an `onResult` callback param on `calculator.js`'s `init()` (no event bus).
- [x] Reset path: `applyResult()` restores every region to baseline before reapplying, every call.
- Verify: browser-tested all 3 tiers (DOM inspection + `.focus()` check) — dimmed regions
  unfocusable/no href, partial hatched with correct county list, "all" restores everything.
  No console errors.

## Phase 18 — Region-card interactivity
Depends on 17. Architecture §3's v1-scope hover/tap layer.

- [x] Wide: hover/focus highlights region + leader line + callout together (pulled forward,
      pure CSS `:has()`, no JS needed).
- [x] Narrow: tap-to-fill single card (clones the matching infographic card, no second copy of
      region data in JS), scroll-into-view honoring `prefers-reduced-motion`. Persistent
      `.region--selected` map class bolds the tapped region's border.
- [x] ~~Region pages read `sessionStorage` → "available to you" badge~~ — dropped, only worked
      for one navigation path (home → calculator → region page).
- [x] Replacement: standalone `/regions/gyeonggi-do/population-decline-counties/` page (same
      shell as `regions/region.njk`), listing all `populationDeclineAreas.json` counties. Linked
      from the map legend and the map's hover tooltip.
- Verify: tap-to-fill logic-tested via `matchMedia` override (real window resize didn't take
  effect in this environment) — card content/link/selected-class and reduced-motion scroll
  behavior all correct. No console errors.

**Core product works end to end here — this is "good enough to show someone."**

## Phase 19 — Deploy
After 11–18 on purpose (no public URL until it's good). Kept short/isolated so "submission
valid" doesn't get conflated with "KTO is live" (Phase 20+).

- [x] Cloudflare Pages project, `KTO_API_KEY`/`KTO_GALLERY_API_KEY` secrets, Web Analytics —
      Analytics enabled natively from the dashboard (no code needed, reverted the manual hook).
- [x] Custom `src/404.njk`.
- [x] Verify cross-directory JSON imports resolve in the real Cloudflare build. Found + fixed a
      real incompatibility: Cloudflare's Functions bundler rejects `with { type: "json" }`
      import attributes — dropped the clause. Confirmed on a live preview deployment.
- [x] Secret check: `KTO_API_KEY` doesn't leak into `_site/` output.
- [x] Added `robots.txt` (disallow-all) + `site.json`'s `noindex` — remove both before Phase 28.
- Verify: all 9 pages 200 live, Analytics fires, 404 works, API endpoints respond.

## Phase 20 — `kto-client.mjs`
Depends on 11 (real codes). Infra only, nothing consumes it yet.

- [x] URL building for `areaBasedList2`/`searchFestival2`/`detailImage2`, paging
      (`fetchKtoAllPages`), timeout, bounded 429/5xx backoff-retry.
- [x] Hard-failure mode: `{ items: [], degraded: true }`, never throw.
- Verify: `node --env-file=.env scripts/verify-kto-client.mjs` — 5/5 pass against real live
      calls (contentTypeId 76 confirmed correct) + forced-failure (bad/missing key) cases.

## Phase 21 — `normalize.mjs`
Depends on 20.

- [x] Zero results → `"items": ""` guard — handled in `kto-client.mjs` (envelope-shape concern,
      not per-field normalization); confirmed against a real zero/near-zero-result call.
- [x] `isUpcomingOrOngoing` filters on `eventenddate` client-side — guards the `eventStartDate`
      quirk (start-only filtering would otherwise drop already-running festivals).
- [x] `imgname` (detailImage2) Korean-only → falls back to the attraction's English title.
- [x] Gallery images with an unknown/missing `cpyrhtDivCd` are dropped (never rendered
      unlicensed); known-licensed images pass through untouched, honoring Type3 no-crop.
- [x] Title En/Ko split, HTML-entity strip, http→https.
- [x] architecture.md §5 quirks list updated with real field names + behavior, confirmed against
      live-captured samples.
- [ ] `Attraction.summary`/`Event.homepageUrl` have no source field on the 3 endpoints in scope
      (would need `detailCommon2`/`detailIntro2`, one call per `contentId` — no batch form).
      Call-volume cost needs weighing against Phase 22's fan-out — revisit after Phase 22-23 once
      real per-page call counts are known.
- Verify: `node scripts/verify-normalize.mjs` — 14/14 pass against real live-captured raw samples
      + constructed edge cases (ongoing/ended festival, non-Korean imgname, unlicensed image).

## Phase 22 — Endpoint wiring + fan-out + caching
Depends on 20 + 21.

- [x] Switch all 3 endpoints to live calls; mock JSON becomes dev-only fallback (gate on
      `KTO_API_KEY` absent from `env`).
- [x] Fan-out for every region with >1 code via `Promise.allSettled`, dedupe by `contentid`. One
      code failing/rejecting only drops that code's items, not the whole region. No
      ranking/scoring on the merge. `gallery.js` fans out differently: `detailImage2` takes a
      single `contentId`, not a region code, so it first seeds attraction contentIds via
      `areaBasedList2` (over-fetched per code, filtered to licensed-image attractions — the
      API's default sort is alphabetical, not image-first) and calls `detailImage2` per seed.
- [x] Cache via `cf: { cacheTtl, cacheEverything }` — festivals 4h, attractions 24h, gallery 14d.
      `fetchKto`/`fetchKtoAllPages` take an optional `cacheTtl` (kto-client.mjs).
- [ ] After deploying this branch: check the data.go.kr call-history log shows real activity
      (do this now, not just at the end in Phase 28 — catches a broken key/logging setup early)
      and spot-check the `cf-cache-status` response header (`cf: { cacheTtl }` only takes effect
      on Cloudflare's real edge, not local `wrangler pages dev`, so neither is checkable yet).
- Verify: `wrangler pages dev` against real live data — multi-code fan-out dedupes correctly
      (gyeonggi-do/jeolla-do), jeju-do events returns a real non-mock array, gallery returns real
      licensed images, unknown slug still 404s, partial fan-out failure still returns the rest.

## Phase 23 — Front-end actually renders the live data
Depends on 22. **This is real, separate work — Phases 20–22 build a working API nothing uses
yet.**

- [ ] Region pages fetch live data client-side, replacing the build-time `mock.attractions` loop.
- [ ] **Event-calendar migration — the big one.** `eleventy/event-calendar.mjs` is a *build-time*
      shortcode; it can't run against client-fetched data as-is. Pick one: port the date-grid
      logic to client JS, or have the Function pre-render calendar HTML server-side.
- [ ] Real `<img>` (replacing `.media-placeholder`) with the crop policy + attribution.
- [ ] Keep `.data-provenance` + empty states working through the swap (Jeju's empty calendar
      must render in-page, not just an empty array).
- [ ] Decide the no-JS story for this content — a bare skeleton isn't an acceptable fallback.
- Verify: live data visible in-page on all 6 regions, Jeju's empty state renders, key never
  reaches the browser, no-JS decision actually implemented and tested.

## Phase 24 — Workation-city expansion
Depends on 12.

- [ ] ~4–6 cities/region, ≥1 verified workation center each.
- Verify: per-region count scripted, every center URL resolves.

## Phase 25 — Remaining de-MOCK + Task #4 copy pass
- [ ] Grep `MOCK`/`PLACEHOLDER` in `_data/*.json`, replace with real values (cost-of-living w/
      `asOf`/`source`/`sourceUrl`, real community links, food descriptions).
- [ ] Confirm `#workation #month-long-stay #2030s-youth #local-tourism` show up as real on-page
      copy tied to actual features, not just floating text.
- [ ] region cards on the homepage: add vibe-tags, update money info to real one
- Verify: grep clean outside dev-only KTO mock fixtures; hashtags confirmed present.

## Phase 26 — Accessibility + robustness (scriptable)
- [ ] `aria-live` on the result caption, keyboard path through the map, 44px hit targets.
- [ ] No-JS pass covering **both** gated surfaces now: the calculator (Phase 16) + map
      click-gating (Phase 17), and region-page KTO content (Phase 23's decision). The sitewide
      nav/tabs/map-link baseline is already closed by `SCAFFOLDING_TODO.md` Phase 9's exhaustive
      static link audit — this pass only needs to cover what's new since then.
- [ ] Resolve `.empty-state` class double-duty (real empty state vs. visa-info's disclaimer use).
- Verify: each item explicitly checked, not eyeballed.

## Phase 27 — Responsive + real-device pass
- [ ] 360/768/1280 + landscape-phone on hero/calculator/caption/map.
- [ ] Real iOS Safari, both orientations.
- [ ] Region-page tabs (single-panel switching) and the shared `.content-page` centered layout
      (region pages, `/visa-info/`, `/communities/`) still need a real DevTools-preset pass.
- Verify: each checkpoint recorded.

## Phase 28 — Contest deliverables (Sept 8–21)
Milestone bucket, not a day/branch phase.

- [ ] 기능설명서 write-up mapped to Task #4 hashtags.
- [ ] Final KTO call-history screenshot (Phase 22 already did an early check).
- [ ] User testing, final link audit, deploy freeze before the deadline.
- [decision] Get a separate/custom domain for the site before the deploy freeze.
- [ ] Remove `robots.txt` + flip `site.json`'s `noindex` to `false` (added Phase 19) — do this
      right before submission.
- [ ] beautify pages: check all the homepage, regional pages and be sure, that they look satisfactory. Make map wider?
- [ ] refactor code: make sure it doesn't have excessive info, that can be deleted
- [UX check] is it understandable that the map is reacting to calc on all surfaces?
- [UX check] perform UX test with several respondents

## Phase 29 — Verification: confirm eligibility-rule ambiguities with MOJ
Milestone bucket, not a day/branch phase. Not a hard blocker for earlier phases — the site can
be built and demoed with the current best-guess interpretations — but should close out before
Phase 28's deploy freeze, since it can change calculator output for real regions/cities.

- [ ] **관심지역 eligibility.** Confirm with MOJ (출입국·외국인정책본부 체류관리과, contact in
      `visa_rules.pdf` p.2, or immigration.go.kr) whether the 18 「관심지역」 watch counties
      qualify for the lower threshold, or only the 89 official 「인구감소지역」 do — see
      architecture.md §7. If narrow: drop the 3 `category: 'watch'` rows from
      `populationDeclineAreas.json` (and from the full backup).
      Sources: [MOIS designation page](https://www.mois.go.kr/frt/sub/a06/b06/populationDecline/screen.do),
      [official mirror PDF](https://www.kla.kr/api/boards/6/posts/25311/files/4305/download),
      [MOJ press release](https://www.moj.go.kr/bbs/immigration/214/608294/artclView.do).
- [ ] **Non-capital decline flag scope.** Decide if non-capital cities that MOIS also lists
      (Gangneung, Gyeongju, Boryeong, Andong, +16 more in `populationDeclineAreasFull.json`)
      deserve their own editorial badge — not needed for the calculator, deliberately deferred.
- [ ] Log other eligibility-rule ambiguities surfaced in Phase 15/16 here instead of guessing.
- [decide] homepage: KTO `Type3` images — `cover` vs `contain`. Moot for the 3 photos currently in
      `hero/` (all Type1); revisit if a Type3 photo is ever swapped in instead.
- Verify: each item has either a confirmed answer + a data update, or an explicit "still open,
  shipping with the default interpretation" note before Phase 28's deploy freeze.

---

## Future ideas — not yet scoped, discuss before Phase 14/23
Raised by the owner, deliberately not phased/estimated yet — don't lose these:
- **Region-page hero image**: not a gallery, a single cover photo under the region name/tags
  (like Phase 14's home-page hero, but per-region). Likely KTO `detailImage2`-sourced, so ties
  into Phase 23's live-gallery-data work and Phase 14's Type3 crop-policy decision.
- **Real interactive calendar**: replace the current static month-grid with one that's navigable
  (month-to-month) and has hover detail on event days — a bigger rebuild than Phase 23's
  render-migration decision, on top of it, not instead of it.

## Cut / descoped

**Decided cuts:** `/regions/` index page — map-only navigation, see top.
Nomad score stays a static editorial int (pre-existing project decision, architecture.md §11).

**Proposed cuts, not yet confirmed:**
nature activities/Go Camping API integration (leaning cut, not decided); 
tax info page content&tax guidance -- currently sketched as one disclaimer line instead of real

## If time runs short — protect in this order
1. **Phases 20–23 (KTO live)** — 20/100 judged points, can't be faked or done late.
2. **Phase 19 (deploy)** — no URL, no submission.
3. **Phase 11 (codes)** — without it, half the KTO integration demos broken.
4. **Phases 12–18 (population-decline data, map + calculator)** — Phase 12 hard-blocks Phase 15
   inside this bucket; together this is the actual Task #4 argument, the "worth showing anyone"
   bar.
5. **Phases 24–25 (real content)** — hashtags need real data behind them.

Cut in this order if behind: gallery auto-advance → nature activities (if not already dropped by
then) → boundary-SVG polish beyond 1 day → landscape-phone tuning → 404 page. **Never let 20–23
be the thing that slips.**
