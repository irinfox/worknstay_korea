# Work&Stay Korea — Feature Roadmap TODO

Each phase = one day, one branch, one PR to main. Complete one phase, verify it, mark `[x]`,
then start the next — don't batch approval across phases.

Numbering starts at 11 because Phases 1–10 lived in `SCAFFOLDING_TODO.md`, deleted once the
scaffold was finished. Contest dev period: 2026-07-27 to 2026-09-21 16:00 KST (see CLAUDE.md).

---

## Phases 11–19 — done (data truth → map → calculator → deploy)

- [x] **11 — Region codes.** `regions.json` `ktoLDongRegnCds` corrected for gangwon-do /
      chungcheong-do / jeolla-do, live-verified against `EngService2` (per-region
      `ktoLDongRegnCdsNote` records each fix). `visaRules.sourceUrl` filled.
- [x] **12 — Population-decline areas.** MOIS 인구감소지역 list sourced into
      `populationDeclineAreas.json` (7 gyeonggi-do records); 107-record nationwide backup in
      `populationDeclineAreasFull.json`. `cities.json` `isPopulationDeclineArea` flags updated
      (`ganghwa` only). See ARCHITECTURE.md §7.
- [x] **13 — Real Korea boundary SVG.** 17 source shapes simplified into the 6 region groups;
      `regions.json` centroids + 6 leader-line coords re-derived; labels positioned; Jeju hit
      target padded to ≥44px via `.region__hit-target`. Inlined SVG ~49KB (≤60KB budget). SVG
      structure contract now in ARCHITECTURE.md §3.
- [x] **14 — Home hero + layout.** `partials/hero.njk` + `hero.css`, calculator/result mount
      points, intro copy, KTO-sourced Type1 hero photo. Narrow/wide viewport bug pass.
- [x] **15 — `eligibility.js`.** Pure `(userInput, referenceData) → EligibilityResult`
      (ARCHITECTURE.md §6); `'partial'` tier via `partialRegionSlugs[]`, global `tier` stays
      3-way. Review caught the rounded-GNI bug → `visaRules.json` now stores MOJ's published
      figures via `thresholdsByMultiplier`. Verify: `scripts/verify-eligibility.mjs`.
- [x] **16 — `calculator.js` + caption + persistence.** Real `<form>` with inline validation
      (empty ≠ 0); renders the 3 tier captions + partial note; `?salaryKrw=&age=&hasFamily=`
      permalink prefills + auto-computes (permalink/persistence removed later: no state kept);
      reference data as a build-time JSON island (`_data/eligibilityReferenceData.js`), no
      client fetch.
      Verify: `scripts/verify-calculator.mjs`.
- [x] **17 — Map eligibility wiring.** `korea-map.js applyResult()` →
      `.region--active/--partial/--ineligible`; partial gets a hatched `<pattern>` + tooltip.
      Click-gating strips `href` from the map shape *and* the card's "Learn more →". `main.js`
      glues via an `onResult` callback (no event bus). Reset restores baseline every call.
- [x] **18 — Region-card interactivity.** Wide: CSS `:has()` highlights region + leader line +
      callout together. Narrow: tap-to-fill single card (clones the infographic card),
      reduced-motion-aware scroll, `.region--selected` map class. `sessionStorage` "available to
      you" badge ~~tried, dropped~~ (only worked for one nav path); replaced by the standalone
      `/regions/gyeonggi-do/population-decline-areas/` page.
- [x] **19 — Deploy.** Cloudflare Pages project, `KTO_API_KEY`/`KTO_GALLERY_API_KEY` secrets,
      native Web Analytics, custom `src/404.njk`, `robots.txt` disallow-all + `noindex` (both
      come off in Phase 32). Secret-leak check clean. `functions/**` JSON-import constraint →
      ARCHITECTURE.md §4.

## Phases 20–22 — done (KTO client → normalize → live endpoints)

- [x] **20 — `kto-client.mjs`.** Paging, timeout, bounded 429/5xx retry; hard failure returns
      `{ items: [], degraded: true }`, never throws. Verify: `scripts/verify-kto-client.mjs`.
- [x] **21 — `normalize.mjs`.** Upcoming/ongoing filter, unknown-`cpyrhtDivCd` images dropped,
      En/Ko title split, http→https. KTO quirks → ARCHITECTURE.md §5.
      Verify: `scripts/verify-normalize.mjs`.
- [x] **22 — Endpoint wiring + fan-out.** Both endpoints live; fallback JSON when `KTO_API_KEY`
      is absent. Multi-code regions fan out via `Promise.allSettled`, dedupe by `contentid`.

## Phases 23–28 — done (live front end → content → compliance → a11y)

- [x] **23 — Front end renders live data.** Region pages fetch KTO client-side
      (`region-data.js`); Ongoing/Upcoming event timeline; attraction `<img>` gated on
      `imageLicense`; `.data-provenance` + `<noscript>` per mount; region + county hero galleries
      (`*HeroPhotos.json` / `*HeroCredits.json`, scroll-snap `region-hero-gallery.js`).
- [x] **24 — Editorial + attraction curation.** `arrange=P` feed with Nature/Culture `lclsSystm`
      whitelist; Area/Type filter pills incl. "Elsewhere"; region descriptions, vibe-tags, food
      gallery and real money figures on home cards.
- [x] **25 — Compliance.** Production caching dropped (KTO needs a separate approval); dev-only
      `KTO_DEV_CACHE=1`. Broad collapse to 3 calls/code (`numOfRows: 250`, client-side
      reclassification), top-picks boost (`boost-curated.mjs`), `eventsSnapshot.json` fallback.
      `locationBasedList2` fallback rejected (ARCHITECTURE.md §5); comma-joined `lDongRegnCd`
      rejected (returns `totalCount: 0`).
      Report: `notes/attraction-gallery-report.md`.
- [x] **26 — Workation-city expansion.** ~4–6 cities/region, ≥1 verified center each where one
      exists; all center URLs resolve.
- [x] **27 — De-MOCK + Task #4 copy.** Food, communities, `/visa-info/` and cost-of-living are
      real and sourced; `MOCK`/`PLACEHOLDER` grep clean.
- [x] **28 — Accessibility + robustness.** `aria-live` result caption, keyboard path through the
      map, 44px coarse-pointer hit targets, `<noscript>` fallbacks.

## Phases 29–31 — done (responsive pass, contest write-up, scope decisions)

- [x] **29 — Responsive pass.** Home, region, `/visa-info/`, `/settling-in/` and the decline page
      checked at 360 / 412 / 768 / 900 / desktop and landscape phone (667×375, 844×390): no
      horizontal overflow. Fixed threshold-range wrap and the coliving divider.
- [x] **30–31 — Contest write-up + decisions.** 기능설명서 mapped to Task #4; custom domain. No
      editorial badge for non-capital decline areas (nationwide list stays reference-only in
      `notes/populationDeclineAreasFull.json`); attraction cards keep `cover` for Type3 images.

## Phase 32 — Public repo release
- [x] UI audit: check all the homepage, regional pages and be sure, that they look satisfactory
- [x] refactor pass: code + docs (ARCHITECTURE.md / ROADMAP) — drop anything stale
- [x] refactor pass: DESIGN.md (design audit)
- [ ] refactor pass: README.md
- [ ] Remove `robots.txt` + flip `site.json`'s `noindex` to `false` (added Phase 19)
- [ ] Publish: change repository visibility to public.


---

## Pending checks & maintenance

- [ ] Real iOS Safari pass, both orientations
- [x] 관심지역 eligibility confirmed by MOJ: watch counties qualify; gross income, FX at application date.
- [ ] Edge-cache option (`cacheTtl` via `cf` in `kto-client.mjs`) deleted as dead code; last
      present in commit 7c2f96a. Restore if KTO approves caching after contest reviews.
- [ ] Hero image licensing: KTO `Type3` images — `cover` vs `contain`. Moot while every hero
      photo is Type1; revisit if a Type3 photo is ever swapped in.


## Possible site extensions
Site enhancement ideas, not scheduled.

- **Personalized stay-recommendation quiz.** Interactive quiz surveying the user's lifestyle
  (leisure, budget, etc.) to match them to the best region and simplify information search.
- **Quantitative "livability index".** Objective rather than subjective: co-working density,
  foreign-patient-friendly hospitals, local delivery infrastructure and similar factors turned
  into indicators, giving an intuitive comparison standard.
- **More dynamic leisure options.** Link in KTO leisure-sports and experience-tourism data
  (and the Go Camping API, formerly "nature activities").
- **"Expectation vs. reality" feedback.** Simple form collecting a match rate, to build trust
  through community verification.
- **Interactive event calendar.** Month-to-month navigation and hover detail on event days, on
  top of the current timeline list.
- **UX testing & validation.** Perform a UX test with several respondents.
