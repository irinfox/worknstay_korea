# Work&Stay Korea — Architecture

Status: approved. Decisions record — what to build and why, independent of scheduling; see
`SCAFFOLDING_TODO.md`/`ROADMAP_TODO.md` for what's built and next. `CLAUDE.md` has the condensed
rules; this file has the reasoning.

## 0. What this site is

An English-language site helping F-1-D (Digital Nomad Visa) holders find a Korean region to
live in outside the Seoul Capital Area: the visa's income-eligibility rules gate/filter a
6-region map, then region pages give living info (cost of living, transport, attractions,
festivals, workation-city list) sourced from the KTO English Tourism Information OpenAPI. Built
for the 2026 관광데이터 활용 공모전, ②-2 웹·앱 구현 부문, **Designated Task #4**.

## 1. Contest constraints that shape this architecture

- **OpenAPI use must be real and checkable.** The FAQ rules out committed-snapshot storage —
  judges check call-history logs on the submitted key during the dev window (2026-07-27–09-21).
  §5 uses a live proxy with edge caching instead of a build-time fetch — the one exception to
  "no backend."
- Designated Task #4, hashtags **#workation #month-long-stay #2030s-youth #local-tourism** (§10).
- **Attribution format is fixed by the FAQ**: plain text "출처: ⓒ한국관광공사" ("Source: © Korea
  Tourism Organization") naming the institution — never a CI/BI logo, never "TourAPI" alone.
  Applied to every `.data-provenance`/photo-credit line.
- Submission needs one live URL. No app-store step, no judge login.

## 2. Tech stack and why

| Layer | Choice | Why |
|---|---|---|
| Site generator | **Eleventy (11ty) v3** | Static output, one dependency, no build chain; slow, deliberate version cadence. |
| Templating | **Nunjucks** (built into 11ty) | Kills header/footer duplication; `pagination` generates all 6 region pages from one `regions.json`. |
| Styling | **Hand-written CSS**, custom properties, Grid/Flexbox, `clamp()` | Zero build step. Tailwind rejected — its v3→v4 break is the exact churn this stack avoids. |
| Client JS | **Vanilla ES modules, no libraries** (~300 lines) | Nav, calculator, map states, tabs — debuggable by reading it, no framework runtime to go stale. |
| Map | **Inline SVG**, 6 region `<g>` groups (Seoul/Incheon as sub-shapes inside Gyeonggi) | No Leaflet/Mapbox/second API key. States are CSS classes, hit targets are real `<a>`. |
| **KTO-sourced data** | **Cloudflare Pages Functions** (`functions/api/*`), edge-cached per content-volatility (§5) | Satisfies "checkable API use"; key stays server-side; caching keeps it fast. The one backend exception. |
| **Static/editorial data** | Build-time JSON in `src/_data/*.json`, hand-authored | Visa rules, cost of living, food, communities, transport aren't KTO-sourced — no live-call need. |
| Hosting | **Cloudflare Pages** (+ Functions) | One vendor for hosting + proxy; free `*.pages.dev` URL meets the live-URL requirement pre-domain. |
| Analytics | **Cloudflare Web Analytics** (v1) | Free, cookieless, no consent banner; one include point to swap later. |
| Fonts | **Instrument Sans + Noto Sans KR** via one Google Fonts `<link>` | Per DESIGN.md; Noto Sans KR covers Hangul place names. |

Dependency footprint: `@11ty/eleventy` is the only direct npm dependency, zero client-side
libraries, one serverless layer that ships with the hosting choice.

**Rejected:** Astro (heavier tree, faster breaking-change cadence). A hand-written 4-page static
site — can't share region markup across 6 pages and can't satisfy the live-API requirement.

## 3. UX decisions locked in

**Region info panel:** two render modes swapped by a **width-only** 1120px breakpoint — never a
hover-triggered popup (bug-prone: edge clipping, z-index, mobile focus-trap). Breakpoint is high
because a narrower card can't fit the longest region name plus its rent figure on one line.

- **Wide:** all 6 callouts render at once around the map, each joined to its region by a static
  hand-positioned SVG leader line (fixed viewBox coords, never computed at runtime). 270/420/270
  grid, slots ordered by each region's `centroid.y`. Shows name + rent, Korean name, blurb, vibe
  tags, "Open <region> →".
- **Narrow:** map above a horizontal scroll-snap carousel of all 6 cards + dots; tapping a region
  scrolls to its card.
- Both modes render from the same region-card partial and per-region data.

**Hover/focus highlight:** hovering/focusing a region or its callout bolds that region's SVG
border, leader line, and callout as one unit; narrow-viewport tap does the same and fills the card.

**Eligibility-gated regions:** greyed-out regions aren't clickable through — showing them as
navigable would misrepresent the visa gating that's the site's core value prop. Gating is
link-only (href stripped from the map shape and the card's "Learn more →"); card content doesn't
change. The *why* lives in the calculator's result caption and the map legend, not the card.
Gyeonggi-do also has a **"partial"** state (hatched, tooltip, still clickable) for its
population-decline counties (§7), linked at `/regions/gyeonggi-do/population-decline-counties/`.

**Seoul/Incheon:** absorbed into the Gyeonggi region page (one page, not three), kept as distinct
labeled sub-shapes on the map since they're locally significant landmarks.

**Region → metro grouping** (confirmed):
```
gyeonggi-do    → Gyeonggi-do, Seoul, Incheon           [capitalArea: true]
gangwon-do     → Gangwon-do
chungcheong-do → Chungcheongbuk-do, Chungcheongnam-do, Daejeon, Sejong
gyeongsang-do  → Gyeongsangbuk-do, Gyeongsangnam-do, Busan, Daegu, Ulsan
jeolla-do      → Jeollabuk-do, Jeollanam-do, Gwangju
jeju-do        → Jeju-do
```

**Korea provinces SVG:** a public-domain per-province boundary SVG (17 shapes,
`src/assets/svg/source/korea-provinces-blank.svg`, provenance in its header comment), simplified
into the 6 region groups. The inlined structure is a contract — `korea-map.njk` inlines it by
that exact filename, `korea-map.js applyResult()` keys off `data-slug`:
```
<a href="/regions/<slug>/" class="region" data-slug="<slug>">
  <g id="<svgGroupId from regions.json>">   .region__shape
                                            [.region__subshape — Seoul/Incheon only]
                                            .region__label
```
Root `<svg>` keeps `viewBox`, `role="group"`, `aria-label`, `<title>`. Budget ≤60KB (~50KB now).
All 6 regions render un-gated until a calculator run greys the ineligible ones.

## 4. Folder structure

```
worknstay_korea/
├── .env / .nvmrc / package.json+lock / eleventy.config.js
├── CLAUDE.md / architecture.md / SCAFFOLDING_TODO.md / ROADMAP_TODO.md
├── functions/api/
│   ├── region/[slug]/{attractions,events}.js   # live KTO calls, no production caching (§5)
│   └── lib/{kto-client,normalize,region-map,city-map,boost-curated}.mjs
├── src/
│   ├── _data/       # editorial JSON: site, regions, cities, visaRules (DATA not code, §6),
│   │                #   costOfLiving, food, transport, communities, populationDeclineAreas[Full]
│   │                #   (§7), eligibilityReferenceData.js (build-time island for calculator.js);
│   │                #   topAttractions.json = per-region picks, boosted + no-key/quota fallback
│   │                #   (§5); eventsSnapshot.json = no-key-only, a point-in-time capture (§5);
│   │                #   {region,county}Hero{Photos,Credits}.json = cover-photo galleries + KOGL credits
│   ├── _includes/   # layouts/{base,page}.njk; partials/{header,footer,hero,region-card,
│   │                #   korea-map,tabs,empty-state}.njk
│   ├── assets/
│   │   ├── css/   tokens.css, base.css, components/*.css
│   │   ├── js/    main, nav, calculator, eligibility, korea-map, region-card, tabs, region-data,
│   │   │          attraction-filters, region-hero-gallery
│   │   ├── img/hero/, img/food/   # committed KOGL/KTO Type1 photos, credited per _data/*Credits.json
│   │   └── svg/   korea-regions.svg (+ source/korea-provinces-blank.svg — Wikimedia, public domain)
│   ├── index.njk / visa-info.njk / settling-in.njk / 404.njk
│   └── regions/region.njk (paginates regions.json → /regions/<slug>/);
│       regions/gyeonggi-do/population-decline-counties.njk
├── scripts/   # verify-{eligibility,calculator,kto-client,normalize,boost-curated,kto-dev-cache}.mjs
└── _site/     # build output (gitignored)
```

Conventions: kebab-case files, `camelCase` JSON keys, one CSS file per component matching the
partial name, one JS module per interactive behaviour exporting a single `init()`. SVGs inline
via the `inlineSvg` shortcode so CSS can target their elements. `functions/**` imports JSON bare
— Cloudflare's Functions bundler rejects `with { type: "json" }`; Eleventy-side `_data/*.js` may
still use it.

## 5. KTO data flow (the compliance-critical part)

```
   Cloudflare env var (KTO key)
        │  server-side only, never in src/ or client bundle
        ▼
  functions/api/region/[slug]/{attractions,events}.js
        │  live call to EngService2 (areaBasedList2, searchFestival2) on every request
        ▼
  normalize.mjs (title split, http→https, HTML-entity strip, license filter)
        ▼
  Region pages fetch these endpoints client-side (`region-data.js`) into skeleton mounts — a
  real, live call on every visit, never a git-committed snapshot.
```

Production caching (`cf.cacheTtl`) is disabled: KTO's compliance check is the API-key
call-history log, and any caching needs a separate approval form (3-5 day review, too slow for
the deadline) since an edge-cache hit would show as a gap in that log. `CACHE_TTL_SECONDS` stays
defined as a one-line revert once/if approved; a dev-only in-memory cache (`kto-client.mjs`,
`KTO_DEV_CACHE=1` in `.dev.vars`) covers manual QA instead. Every page view is now a live
round-trip — dev key is 1,000 calls/day per endpoint (`areaBasedList2`/`searchFestival2` quotas
are independent), worst case ~36 calls (gyeongsang-do). KTO's optional "operating account" isn't
needed for compliance (regular dev-key history counts).

Region/county **hero photos** and **dish photos** are the exception: hand-picked once (via KTO
PhotoGalleryService1/EngService2, counting toward call history — Wikimedia Commons and the
author's own photos fill the rest), then committed as static files under `assets/img/hero/` and
`assets/img/food/` — an editorial choice, not something an API should pick per request.

Static/editorial `_data/*.json` (visa rules, cost of living, food, communities, transport)
bypasses this pipeline entirely — not KTO-sourced, no "live" requirement.

**Known KTO data quirks baked into `kto-client.mjs`/`normalize.mjs`:**
- v4 renumbered content types — attraction is `76`, not the old `12`.
- `areaBasedList2` uses undocumented `arrange=P` (view-count) over documented `Q` (modified-date,
  buries landmarks). The arrange probe is folded into the fan-out's first (VE) call rather than a
  separate throwaway one: if that call comes back genuinely empty (and it's not quota exhaustion,
  429 code 22), the rest of the fan-out — plus a refetch of that one call — switches to
  `arrange=R`. `{ items, quotaExceeded }` lets the UI say "come back tomorrow" instead of a false
  empty state.
- `topAttractions.json` (hand-verified, per region) is boosted into live results
  (`boost-curated.mjs`): `hard` picks are injected if missing from the live query, `soft` picks
  only repositioned if already present. Same file is the no-key/quota-exhausted fallback.
- Attraction fetching is 3 broad `areaBasedList2` calls per `lDongRegnCd` code
  (`lclsSystm1=NA/VE/HS`, `numOfRows: 250`, no KTO-side sub-code filter), reclassified
  client-side into curated `lclsSystm2/3` codes (not `cat1/2/3`, which under-surfaced popular
  sites) — cheaper than one narrowed call per sub-code and spans `contentTypeId` on its own
  (76+78 in one query, no per-type call needed). City tagging matches each item's own
  `lDongSignguCd` against `cities.json`.
- `areacode` is empty on festival records — always filter by `lDongRegnCd`.
- Raw `items` is `""` on zero results, a bare object on one result, an array only at 2+ —
  `kto-client.mjs` always normalizes to an array.
- Images serve over `http://` — rewritten to `https://` to avoid mixed-content blocking.
- Titles are bilingual/messy, sometimes with nested parens — split into `titleEn`/`titleKo` at
  the normalize step.
- `searchFestival2` often returns Korean `addr1`/`addr2` despite being the English service — the
  UI shows a best-effort city extraction, full address on the copy control; no romanizer in the
  stack.
- `searchFestival2`'s `eventStartDate` filters by start date only, so `isUpcomingOrOngoing`
  client-filters by `eventenddate` against a deliberately earlier query window.
- Image licensing is per-record via `cpyrhtDivCd` (`Type1`, `Type3`, empty) — only render known
  codes, never crop/filter `Type3`.
- `firstimage`/`firstimage2` don't always both resolve — one can 404 on KTO's own CDN even when
  the other is fine. `region-data.js`'s `setupImageFallback` swaps a dead `<img>` to the other
  URL, then to the placeholder, rather than showing a broken image.
- Some regions (Jeju, Jeollanam-do) currently have zero upcoming festivals — a designed empty
  state, not a bug.
- City-level filtering adds `lDongSignguCd` (from `ldongCode2`) alongside `lDongRegnCd`, narrowing
  `areaBasedList2` to one city. Stored per `City` as `ktoLDongRegnCd`/`ktoLDongSignguCds[]`; empty
  array = city is its whole `lDongRegnCd`. Gwangju fans out across its 5 gu codes (no single
  signgu code for merged region `"12"`).

## 6. Data models

```
Region        slug, nameEn, nameKo, svgGroupId, centroid{x,y},
              isCapitalArea, ktoLDongRegnCds[], ktoAreaCodes[],
              vibeTags[], nomadScore, shortIntro, longIntro,
              heroImageIds[], costOfLivingKey
              // nomadScore: static editorial int for v1 — real scoring is a separate future project

City          slug, regionSlug, nameEn, nameKo, lat, lng, blurb,
              workationCenters[{ name, url, note }],
              ktoLDongRegnCd, ktoLDongSignguCds[]  // §5's city-level KTO filter pair

Attraction    contentId, regionSlug, lDongRegnCd, lDongSignguCd, titleEn, titleKo,
              summary, address, imageUrl, imageThumbUrl, imageLicense,
              lat, lng, sourceModifiedAt,
              category: 'nature' | 'culture', citySlug: string | null
              // from KTO, via Functions proxy; citySlug null if unmatched to a known city

Event         contentId, regionSlug, lDongRegnCd, titleEn, titleKo,
              startDate, endDate, address, imageUrl, imageLicense,
              tel, homepageUrl                     // from KTO, via Functions proxy

Dish          regionSlug, city, nameEn, nameKo, imagePath, heat?: 'spicy',
              kind?: 'spicy-ingredient' | 'drink' | 'dessert', caption,
              descriptionSourceUrl?, restaurantUrl?, photo{ src, author,
              license?, licenseUrl?, sourceUrl?, sourceApi?, galContentId? }
              // static; heat and kind are independent axes. city omitted for Jeju (no
              // per-dish city breakdown in the source data)

CostOfLiving  regionSlug, currency, asOf, source, sourceUrl,
              rent1brCityCentre, monthlyBudgetSingle, mealInexpensive,
              transitPass, utilities, indexVsSeoul // static, hand-curated snapshot

Transport     regionSlug, airports[{name, iata, note}], railNote,
              intercityBusNote, localTransitNote, carRecommended:bool

NatureActivity  regionSlug, name, type, difficulty, season, url   // stretch; leaning cut

VisaRules     version, effectiveFrom, gniReferenceYear, gniPerCapitaKrw, currency: 'KRW',
              sourceUrl, disclaimer,
              thresholdsByMultiplier{ [multiplier]: thresholdKrw }  // published figures, not derived (§7)
              ageBands[{ minAge, maxAge, multiplierCapitalArea, multiplierNonCapitalArea }],
              familyMultiplier{ multiplierCapitalArea, multiplierNonCapitalArea }  // same shape as ageBands

PopulationDeclineArea   countyNameEn, countyNameKo, provinceSlug, metroEn,
                        category: 'decline' | 'watch'
                        // working file: gyeonggi-do only (§7); full 107-record set in
                        //   populationDeclineAreasFull.json, not read by the build

EligibilityResult   tier: 'ineligible' | 'nonCapitalOnly' | 'all'
                    dimmedRegionSlugs[], partialRegionSlugs[]
                    thresholdCapitalKrw, thresholdNonCapitalKrw
                    gapToNonCapitalKrw, gapToCapitalKrw
                    // tier is 3-way; partiality is per-region (§7). Two gap fields so the
                    // nonCapitalOnly caption can say "how much more unlocks the capital area."
```

`VisaRules` is **JSON data, not JavaScript** — `eligibility.js` is a pure function
`(userInput, referenceData) → EligibilityResult` (`userInput = { salaryKrw, age, hasFamily }`,
`referenceData = { rules, regions, populationDeclineAreas }`). No DOM, testable via
`scripts/verify-eligibility.mjs`. Thresholds update by editing `visaRules.json` — no code change.

`Region.nameKo` ships from day one (CLAUDE.md rule 9) though v1 is English-only.

## 7. Visa eligibility rules (source of truth for `visaRules.json`)

From the Ministry of Justice's F-1-D announcement (2025 GNI reference = 52,410,000 KRW):

| Age | Capital area (excl. population-decline-designated counties) | Non-capital area + population-decline-designated counties |
|---|---|---|
| 18–34 | GNI × 1.5 = 78,620,000 KRW | GNI × 1.0 = 52,410,000 KRW |
| 35+ | GNI × 2.0 = 104,830,000 KRW | GNI × 1.5 = 78,620,000 KRW |

Family accompaniment (spouse + minor children): capital → ×2.0 regardless of age; non-capital/
decline area → ×1.5. KRW only. Other visa facts for the static visa-info page (not the
calculator): ≥100M KRW health insurance required, age 18+ (dependents exempt), max stay 3 years
(1yr + renewals), no local paid work, convertible from B-1/B-2/C-3.

The "GNI × multiplier" column is MOJ's framing, not an exact formula: multiplying the *rounded*
`gniPerCapitaKrw` is off by ₩5,000–10,000 from the published figures (MOJ used the unrounded
GNI), so `visaRules.json` stores the published `thresholdsByMultiplier` directly instead of
deriving them.

**County-level accuracy for population-decline areas (not simplified away):** the real rule's
non-capital bucket also includes specific counties on Korea's official 인구감소지역 list, some
inside Gyeonggi-do — blanket-treating "Gyeonggi = capital tier" would misrepresent their
eligibility:

- `populationDeclineAreas.json` holds the MOIS-designated list (`mois.go.kr`, 지방자치분권 및
  지역균형발전에 관한 특별법 §2/시행령 §3, first designated 2021-10, 5-year cycle): 89 「인구감소지역」
  (`category: 'decline'`) + 18 「관심지역」(`'watch'`), trimmed to the 7 gyeonggi-do records — the
  only capital-tier region, so the only place this changes an outcome; full 107-record set in
  `populationDeclineAreasFull.json` (not read by the build). Whether `'watch'` counties qualify
  too is unconfirmed (ambiguous press-release wording) — modeled as the broader reading pending
  MOJ confirmation.
- Each `City` carries `isPopulationDeclineArea`, true only for a Gyeonggi/Incheon workation city
  on the list (currently just `ganghwa`) — no meaning elsewhere, so `false` even where MOIS also
  designates the county (Gangneung, Andong, …).
- `eligibility.js` returns `'partial'` for a nominally capital-tier region containing at least
  one independently-qualifying decline county (today: `gyeonggi-do` only). Map/UI in §3.

## 8. State management

No library, no store. Three tiers:

1. **Local/DOM state** — burger open/closed, active tab. Lives in the owning module as a CSS
   class on one element.
2. **Shared state — exactly one piece:** `EligibilityResult`. `calculator.js` reads inputs →
   calls pure `eligibility.js` → renders its own result caption; `main.js` glue separately calls
   `koreaMap.applyResult(result)` for the map. One-directional, ~10 lines of glue, no event bus.
3. **Persistence** — the result lives in the URL only (`?salaryKrw=&age=&hasFamily=`), not stored
   client-side: reloading/sharing reproduces it, but region pages don't read or remember a
   calculator run.

## 9. Responsive strategy

- Header/nav: one `<ul>` always in the DOM; `nav.js` toggles `[aria-expanded]` on the burger
  (never two navs). Burger under ~768px.
- Region info: two modes swapped by the width-only 1120px query — see §3.
- Region page Overview tab: cities list + event timeline are a 2-column grid ≥900px, stacked
  below that (cities first); Attractions and Local food stack below as full-width blocks. Living
  Info is the only other tab (cost-of-living + transport).
- Horizontal scroll-snap lists (e.g. `.attraction-list`): CSS `scroll-snap-type: x mandatory` +
  `overflow-x: auto`, no carousel library, no JS required.
- Map: SVG with `viewBox` + `max-width: 100%`. Jeju has an invisible `.region__hit-target`
  ellipse padding its tap area to ≥44px at 360px width (its shape alone is ~39px tall).
- Map labels: all 17 admin-division/city names render at every width, no summary fallback.
- iOS Safari: `100svh`/`100dvh` not `100vh`, 16px input font-size to prevent focus-zoom,
  `-webkit-text-size-adjust: 100%`.
- Test matrix (CLAUDE.md rule 7) plus a width just above/below 1120px for the
  infographic↔carousel switch.

## 10. Designated Task #4 alignment (for the eventual 기능설명서)

The task's hashtags **#workation #month-long-stay #2030s-youth #local-tourism** are the site's
vibe-tag vocabulary. Every major feature traces back to one:
- Eligibility calculator + map gating → sustainable-residency framing (not one-off tourism)
- Region living-info (cost of living, transport, workation cities) → month-long-stay support
- Attractions/festivals/food → local-tourism content, framed as "living here," not sightseeing

## 11. Feedback log (approach decisions made and why)

- **`locationBasedList2` as a second-tier fallback when `areaBasedList2`'s daily quota is
  exhausted — rejected.** No clean single-circle lat/lng+radius coverage for multi-province
  regions; unconfirmed `lclsSystm` filter support; `topAttractions.json` already covers this
  scenario with an honest message and zero new endpoint risk.
