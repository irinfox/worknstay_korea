# Work&Stay Korea — Feature Roadmap TODO

Each phase = one day, one branch, one PR to main. Continues `SCAFFOLDING_TODO.md`'s numbering
(ends at Phase 10). Complete one phase, verify it, mark `[x]`, then start the next — don't batch
approval across phases. Hard deadline 2026-09-21 16:00 KST (see CLAUDE.md).

Order: data → real map → calculator → map wiring → deploy → KTO live → content. No public URL
until Phase 19.

---

## Phases 11–19 — done (data truth → map → calculator → deploy)

- [x] **11 — Region codes.** `regions.json` `ktoLDongRegnCds` corrected for gangwon-do /
      chungcheong-do / jeolla-do, live-verified against `EngService2` (per-region
      `ktoLDongRegnCdsNote` records each fix). `visaRules.sourceUrl` filled.
- [x] **12 — Population-decline areas.** MOIS 인구감소지역 list sourced into
      `populationDeclineAreas.json` (7 gyeonggi-do records); 107-record nationwide backup in
      `populationDeclineAreasFull.json`. `cities.json` `isPopulationDeclineArea` flags updated
      (`ganghwa` only). See architecture.md §7.
- [x] **13 — Real Korea boundary SVG.** 17 source shapes simplified into the 6 region groups;
      `regions.json` centroids + 6 leader-line coords re-derived; labels positioned; Jeju hit
      target padded to ≥44px via `.region__hit-target`. Inlined SVG ~49KB (≤60KB budget). SVG
      structure contract now in architecture.md §3.
- [x] **14 — Home hero + layout.** `partials/hero.njk` + `hero.css`, calculator/result mount
      points, intro copy, KTO-sourced Type1 hero photo. Narrow/wide viewport bug pass.
- [x] **15 — `eligibility.js`.** Pure `(userInput, referenceData) → EligibilityResult`
      (architecture.md §6); `'partial'` tier via `partialRegionSlugs[]`, global `tier` stays
      3-way. Review caught the rounded-GNI bug → `visaRules.json` now stores MOJ's published
      figures via `thresholdsByMultiplier`. Verify: `scripts/verify-eligibility.mjs`.
- [x] **16 — `calculator.js` + caption + persistence.** Real `<form>` with inline validation
      (empty ≠ 0); renders the 3 tier captions + partial note; `?salaryKrw=&age=&hasFamily=`
      permalink prefills + auto-computes; reference data as a build-time JSON island
      (`_data/eligibilityReferenceData.js`), no client fetch. Verify: `scripts/verify-calculator.mjs`.
- [x] **17 — Map eligibility wiring.** `korea-map.js applyResult()` →
      `.region--active/--partial/--ineligible`; partial gets a hatched `<pattern>` + tooltip.
      Click-gating strips `href` from the map shape *and* the card's "Learn more →". `main.js`
      glues via an `onResult` callback (no event bus). Reset restores baseline every call.
- [x] **18 — Region-card interactivity.** Wide: CSS `:has()` highlights region + leader line +
      callout together. Narrow: tap-to-fill single card (clones the infographic card),
      reduced-motion-aware scroll, `.region--selected` map class. `sessionStorage` "available to
      you" badge ~~tried, dropped~~ (only worked for one nav path); replaced by the standalone
      `/regions/gyeonggi-do/population-decline-counties/` page.
- [x] **19 — Deploy.** Cloudflare Pages project, `KTO_API_KEY`/`KTO_GALLERY_API_KEY` secrets,
      native Web Analytics, custom `src/404.njk`, `robots.txt` disallow-all + `noindex` (both
      come off in Phase 29). Secret-leak check clean. `functions/**` JSON-import constraint →
      architecture.md §4.

## Phases 20–22 — done (KTO client → normalize → live endpoints)

- [x] **20 — `kto-client.mjs`.** URL building for `areaBasedList2`/`searchFestival2`, paging,
      timeout, bounded 429/5xx retry. Hard-failure mode `{ items: [], degraded: true }`, never
      throws. Verify: `scripts/verify-kto-client.mjs`.
- [x] **21 — `normalize.mjs`.** `isUpcomingOrOngoing` (guards `eventStartDate` start-only
      filtering), unknown-`cpyrhtDivCd` images dropped, title En/Ko split, entity strip,
      http→https. KTO quirks list is architecture.md §5. Verify: `scripts/verify-normalize.mjs`.
  - [ ] `Attraction.summary` / `Event.homepageUrl` have no source field on the 2 in-scope
        endpoints (would need `detailCommon2`/`detailIntro2`, one call per `contentId`) — weigh
        call-volume cost before Phase 29.
- [x] **22 — Endpoint wiring + fan-out + caching.** Both endpoints live; mock JSON is the
      `KTO_API_KEY`-absent dev fallback. Multi-code regions fan out via `Promise.allSettled`,
      dedupe by `contentid`, one code failing drops only its items. Cache via `cf.cacheTtl` —
      attractions 24h, festivals 4h.
  - [ ] data.go.kr's individual-account mypage shows only approval status, no call-count
        dashboard found. Live calls confirmed working regardless; recheck for a real log view
        before Phase 29.

## Phase 23 — done (front end renders live data)

- [x] Region pages fetch live KTO client-side (`assets/js/region-data.js`); build-time mock loop
      and `eleventy/event-calendar.mjs` removed.
- [x] Event timeline: Ongoing/Upcoming segmented-slider tabs, primary-tinted cards throughout.
      Ongoing is one list with an inline "Long-term" / "This month" sticky-note badge per card;
      Upcoming = later months as short-name "Mon (n)" sub-tabs. Fixed-size two-row calendar chip
      holds the full date range at one font size, semibold titles, address as city +
      copy-full-address icon, per-month pager past 5.
- [x] Attraction `<img>` gated on `imageLicense` (null → `.media-placeholder`).
- [x] `.data-provenance` per section; `<noscript>` fallback in every mount, verified in raw HTML.
- [x] Region + county hero galleries: `regionHeroPhotos.json` / `countyHeroPhotos.json` →
      ordered filename lists (`assets/img/hero/<slug>/`); `*HeroCredits.json` → per-file KTO
      Type1 credit + caption (attraction + short city EN/KO, full address in `addressEn`/Ko).
      Scroll-snap track + `region-hero-gallery.js` (prev/next/dots/autoplay), `.region-hero`
      `16/9`. Yeosu entry's Type1 rests on a manual classification, noted inline.
  - [x] Zero-events / same-month states previewable via `?preview=empty` / `?preview=thismonth`
        on any region page (region-data.js — live data has neither right now; jeju-do at 1 event
        exercises the no-tabs single-month path).

## Phase 24 — Region editorial + attraction curation
Iterative editorial/research work, mostly hand-curation — do one region at a time.

- [x] Attraction feed: `areaBasedList2` with `arrange=P` (view-count order); medical-tourism
      venues dropped by `cat3` A02020500 + name regex.
- [ ] Attraction curation (re-research): per-region pinned allowlist of flagship sites (palaces
      etc. rank below the row window), content-type mix (관광지 vs 문화시설), high no-image rate,
      per-region count, same-name branch dedupe.
- [ ] Region description rewrite (all 6).
- [ ] Home region cards: vibe-tags.
- [x] Home region cards: food gallery.
- [ ] Home region cards: real money figures (replace MOCK).

## Phase 25 — Workation-city expansion
Depends on 12.

- [ ] ~4–6 cities/region, ≥1 verified workation center each.
- Verify: per-region count scripted, every center URL resolves.

## Phase 26 — Remaining de-MOCK + Task #4 copy pass
- [x] Food gallery: real dishes, descriptions, photos, and credits for all 6 regions —
      `food.json` clean of MOCK/PLACEHOLDER.
- [ ] Grep `MOCK`/`PLACEHOLDER` in remaining `_data/*.json`, replace with real values
      (cost-of-living w/ `asOf`/`source`/`sourceUrl`, real community links).
- [ ] `communities.json` links + `/visa-info/` copy verified against current official sources.
- [ ] Confirm `#workation #month-long-stay #2030s-youth #local-tourism` show up as real on-page
      copy tied to actual features, not just floating text.
- Verify: grep clean outside dev-only KTO mock fixtures; hashtags confirmed present.

## Phase 27 — Accessibility + robustness (scriptable)
- [ ] `aria-live` on the result caption, keyboard path through the map, 44px hit targets.
- [ ] No-JS pass covering **both** gated surfaces now: the calculator (Phase 16) + map
      click-gating (Phase 17), and region-page KTO content (Phase 23's decision). The sitewide
      nav/tabs/map-link baseline is already closed by `SCAFFOLDING_TODO.md` Phase 9's exhaustive
      static link audit — this pass only needs to cover what's new since then.
- [ ] Resolve `.empty-state` class double-duty (real empty state vs. visa-info's disclaimer use).
- Verify: each item explicitly checked, not eyeballed.

## Phase 28 — Responsive + real-device pass
- [ ] 360/768/1280 + landscape-phone on hero/calculator/caption/map.
- [ ] Real iOS Safari, both orientations.
- [ ] Region-page tabs (single-panel switching) and the shared `.content-page` centered layout
      (region pages, `/visa-info/`, `/settling-in/`) still need a real DevTools-preset pass.
- Verify: each checkpoint recorded.

## Phase 29 — Contest deliverables (Sept 8–21)
Milestone bucket, not a day/branch phase.

- [ ] 기능설명서 write-up mapped to Task #4 hashtags.
- [ ] Final KTO call-history screenshot (Phase 22 already did an early check).
- [ ] User testing, final link audit, deploy freeze before the deadline.
- [decision] Get a separate/custom domain for the site before the deploy freeze.
- [ ] Remove `robots.txt` + flip `site.json`'s `noindex` to `false` (added Phase 19) — do this
      right before submission.
- [ ] beautify pages: check all the homepage, regional pages and be sure, that they look satisfactory. Make map wider?
- [ ] refactor pass: code + docs (architecture.md / ROADMAP / SCAFFOLDING) — drop anything stale
      or excessive
- [decide] Real interactive event calendar (month-to-month navigation, hover detail on event
      days) on top of Phase 23's timeline list — worth building given remaining time?
- [UX check] is it understandable that the map is reacting to calc on all surfaces?
- [UX check] perform UX test with several respondents

## Phase 30 — Verification: confirm eligibility-rule ambiguities with MOJ
Milestone bucket, not a day/branch phase. Not a hard blocker for earlier phases — the site can
be built and demoed with the current best-guess interpretations — but should close out before
Phase 29's deploy freeze, since it can change calculator output for real regions/cities.

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
- [decide] homepage: KTO `Type3` images — `cover` vs `contain`. Moot while every hero photo is
      Type1; revisit if a Type3 photo is ever swapped in.
- Verify: each item has either a confirmed answer + a data update, or an explicit "still open,
  shipping with the default interpretation" note before Phase 29's deploy freeze.

---

## Cut / descoped

**Decided cuts:** `/regions/` index page — regions are navigable from the interactive map only.
Nomad score stays a static editorial int (architecture.md §6).

**Proposed cuts, not yet confirmed:** nature activities / Go Camping API integration (leaning
cut); tax-info page content — currently one disclaimer line instead of real guidance.

## If time runs short — protect in this order
1. **Phase 29 deliverables** (기능설명서, KTO call-history evidence, deploy freeze) — non-negotiable.
2. **Phases 24–26** (real content) — the hashtags need real data behind them.
3. **Phase 28** (real-device pass), then **Phase 27** (a11y).

Cut first if behind: interactive event calendar (Phase 29 `[decide]`) → nature activities →
landscape-phone tuning.
