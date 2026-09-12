# Work&Stay Korea — Architecture

Status: approved. This document describes the site's technical architecture and decisions —
what to build and why — independent of project scheduling; see `SCAFFOLDING_TODO.md` and
`ROADMAP_TODO.md` for what's built and what's next. See `CLAUDE.md` for the condensed rules;
this file has the reasoning and detail.

## 0. What this site is

An English-language site helping F-1-D (Digital Nomad Visa) holders find a Korean region to
live in outside the Seoul Capital Area, using the visa's actual income-eligibility rules to
gate/filter a 6-region map, then giving region-level living info (cost of living, transport,
attractions, festivals, workation-city list) sourced from the KTO English Tourism Information
OpenAPI. Built for the 2026 관광데이터 활용 공모전, ②-2 웹·앱 구현 부문, **Designated Task #4**.

## 1. Contest constraints that shape this architecture

- **OpenAPI use must be real and checkable.** The contest FAQ rules out local DB /
  committed-snapshot storage — judges verify actual call-history logs on the submitted key
  during the dev window (2026-07-27–09-21). This is why §5 uses a live proxy with short-TTL edge
  caching instead of a build-time fetch — the one deliberate exception to "no backend."
- Designated Task #4, anchored on the hashtags **#workation #month-long-stay #2030s-youth
  #local-tourism** (see §10).
- **Attribution format is fixed by the contest FAQ**, not a style choice: plain text
  "출처: ⓒ한국관광공사" (English: "Source: © Korea Tourism Organization"), always naming the
  institution — never its CI/BI logo image, never the API/service name ("TourAPI") alone as the
  sole identifier. Applied to every `.data-provenance`/photo-credit line site-wide.
- Submission needs one live URL. No app-store step, no login required for judges.

## 2. Tech stack and why

| Layer | Choice | Why |
|---|---|---|
| Site generator | **Eleventy (11ty) v3** | Static HTML output, one dependency, no Vite/Babel/PostCSS chain. Templates are HTML+`{{ }}`, stack traces point at your file. Slow, deliberate major-version cadence. |
| Templating | **Nunjucks** (built into 11ty) | Layouts/partials kill header-footer duplication; `pagination` generates all 6 region pages from one `regions.json`. |
| Styling | **Hand-written CSS**, custom properties, Grid/Flexbox, `clamp()` | Zero build step, zero churn. Tailwind explicitly rejected — its v3→v4 break is exactly the failure mode the stability constraint forbids. |
| Client JS | **Vanilla ES modules, no libraries** (~300 lines total) | Nav toggle, calculator, map states, tabs. Debuggable by reading it; no framework runtime to go stale. |
| Map | **Inline SVG**, 6 region `<g>` groups (Seoul/Incheon as labeled sub-shapes inside Gyeonggi) | No Leaflet/Mapbox, no second API key/vendor. States are CSS classes, hover is `:hover`, hit targets are real `<a>`. |
| **KTO-sourced data** | **Cloudflare Pages Functions** (`functions/api/*`) proxying live KTO calls, edge-cached per content-volatility (see §5) | Satisfies the "real, checkable API use" constraint; keeps the API key server-side; keeps response times fast via caching. This is the one deliberate exception to "no backend." |
| **Static/editorial data** | Build-time JSON in `src/_data/*.json`, hand-authored, committed | Visa rules, cost-of-living snapshot, food, communities, transport — none of this is KTO-sourced, so none of it needs live calls. |
| Hosting | **Cloudflare Pages** (+ Functions) | One vendor for static hosting and the proxy layer; free `*.pages.dev` URL satisfies the contest's "live URL" requirement even before a custom domain exists. |
| Analytics | **Cloudflare Web Analytics** (v1) | Free, cookieless, no consent banner. Wired through one script-include point so swapping to GA/Amplitude later (portfolio goal) is a one-line change. |
| Fonts | **Instrument Sans + Noto Sans KR** via one Google Fonts `<link>` | DESIGN.md § Type fixes both families; Noto Sans KR covers Hangul place names. One request, `display=swap`. |

Total dependency footprint: `@11ty/eleventy` as the only direct npm dependency, zero
client-side libraries, one small serverless layer that ships with the hosting choice (not a
separate vendor).

**Rejected alternatives:** Astro (bigger dependency tree, faster breaking-change cadence than
11ty). A fully static/zero-build site (4 hand HTML files) — rejected because 6 region pages
would either duplicate markup or need client-side templating, and it can't satisfy the
live-API-call requirement at all.

## 3. UX decisions locked in

**Region info panel (map interaction):** two render modes swapped by a **width-only** media
query at 1120px (`--bp-region-info-wide`) — never a hover-triggered floating popup. Width, not
device class. Breakpoint is high because a narrower card can't hold the longest region name
plus its rent figure on one line.

- **Wide:** all 6 region callouts render at once, arranged around the map, each joined to its
  region by a static hand-positioned SVG leader line (fixed viewBox coordinates, never computed
  at runtime). Layout is a 270/420/270 grid, natural width 1000px; callouts sit in fixed
  left/right slots ordered by each region's `centroid.y`. Each shows name + rent, Korean name,
  blurb, vibe tags, "Open <region> →".
- **Narrow:** the map alone above a horizontal scroll-snap carousel of all 6 cards + dots.
  Tapping a region scrolls the carousel to its card.
- Both modes render from the same region-card partial and per-region data.

**Hover/focus highlight (both modes):** hovering/focusing a region or its callout bolds that
region's SVG border, leader line, and callout together as one unit; narrow-viewport tap does the
same alongside filling the card.

**Eligibility-gated regions:** greyed-out (ineligible) regions are **not** clickable through to
their region page — showing them as navigable would misrepresent the gating that's the site's
core value proposition. Gating is link-only: the map shape and the card's "Learn more →" lose
their `href`; the card's content (name, tags, intro, cost) doesn't change. The *why* lives
outside the card — the calculator's result caption and the map's color-key legend. Gyeonggi-do
also has a third **"partial"** state (hatched fill, tooltip, still clickable) because it contains
population-decline counties that qualify at the lower threshold — see §7; those counties are
listed at `/regions/gyeonggi-do/population-decline-counties/`, linked from the legend and tooltip.

**Seoul/Incheon:** absorbed into the Gyeonggi region page (one page, not three), but kept as
distinct labeled sub-shapes on the map since they're locally significant landmarks.

**Region → metro grouping** (confirmed):
```
gyeonggi-do    → Gyeonggi-do, Seoul, Incheon           [capitalArea: true]
gangwon-do     → Gangwon-do
chungcheong-do → Chungcheongbuk-do, Chungcheongnam-do, Daejeon, Sejong
gyeongsang-do  → Gyeongsangbuk-do, Gyeongsangnam-do, Busan, Daegu, Ulsan
jeolla-do      → Jeollabuk-do, Jeollanam-do, Gwangju
jeju-do        → Jeju-do
```

**Korea provinces SVG:** a public-domain per-province boundary SVG (17 first-tier shapes,
`src/assets/svg/source/korea-provinces-blank.svg`, provenance in its header comment), simplified
into the 6 region groups. The inlined structure is a contract — `korea-map.njk` inlines it by
that exact filename, and `korea-map.js applyResult()` keys off `data-slug`:
```
<a href="/regions/<slug>/" class="region" data-slug="<slug>">
  <g id="<svgGroupId from regions.json>">   .region__shape
                                            [.region__subshape — Seoul/Incheon only]
                                            .region__label
```
Root `<svg>` keeps `viewBox`, `role="group"`, `aria-label`, `<title>`. Budget: ≤60KB inlined
(~50KB now). The map shows all 6 regions un-gated until a calculator run greys the ineligible ones.

## 4. Folder structure

```
worknstay_korea/
├── .env                        # KTO key for local dev only — read by scripts/ and Functions env
├── .nvmrc
├── package.json / package-lock.json
├── eleventy.config.js
├── CLAUDE.md
├── architecture.md
├── SCAFFOLDING_TODO.md
├── ROADMAP_TODO.md
├── functions/
│   └── api/
│       ├── region/[slug]/attractions.js   # live KTO call, edge-cached (24h)
│       ├── region/[slug]/events.js        # live KTO call, edge-cached (4h)
│       └── lib/
│           ├── kto-client.mjs             # URL building, paging, retry, 429 backoff
│           ├── normalize.mjs              # KTO shape → our models (title split, https, sanitize)
│           └── region-map.mjs             # lDongRegnCd ↔ 6-region slug mapping
├── src/
│   ├── _data/
│   │   ├── site.json           # name, nav items, footer disclaimer
│   │   ├── regions.json        # 6 regions, hand-authored (editorial source of truth)
│   │   ├── cities.json         # workation-centre cities (hand-curated, expand over time)
│   │   ├── visaRules.json      # thresholds + age bands — DATA, not code (see §6)
│   │   ├── costOfLiving.json   # hand-curated snapshot w/ asOf + source URL
│   │   ├── food.json           # regional dishes (static)
│   │   ├── transport.json      # Living Info tab
│   │   ├── communities.json    # communities page links
│   │   ├── populationDeclineAreas.json  # MOIS 인구감소지역 list (§7)
│   │   ├── populationDeclineAreasFull.json  # 107-record nationwide backup, not read by the build
│   │   ├── mock/{attractions,events}.json  # KTO-shaped fixtures; dev fallback when
│   │   │                        # KTO_API_KEY is absent from env
│   │   ├── eligibilityReferenceData.js  # build-time JSON island for calculator.js
│   │   ├── regionHeroPhotos.json, regionHeroCredits.json  # region cover-photo galleries
│   │   │                        # (slug → [filename in assets/img/hero/<slug>/]) + KOGL credits
│   │   └── countyHeroPhotos.json, countyHeroCredits.json  # same, for the Gyeonggi decline counties
│   ├── _includes/
│   │   ├── layouts/{base,page}.njk
│   │   └── partials/{header,footer,hero,region-card,korea-map,tabs,empty-state}.njk
│   ├── assets/
│   │   ├── css/  tokens.css, base.css, components/*.css
│   │   ├── js/   main.js, nav.js, calculator.js, eligibility.js,
│   │   │         korea-map.js, region-card.js, tabs.js, region-data.js,
│   │   │         region-hero-gallery.js
│   │   ├── img/hero/{home,<region-slug>,gyeonggi-do-population-decline}/  # KOGL Type1 cover
│   │   │         #   photos, credited in _data/{hero,regionHero,countyHero}Credits.json
│   │   ├── img/food/<region-slug>/  # dish photos, credited inline per-record in food.json's
│   │   │         #   `photo` object (no separate credits file — one photo per dish, not a gallery)
│   │   └── svg/  korea-regions.svg  (+ source/korea-provinces-blank.svg — Wikimedia, public domain)
│   ├── index.njk / visa-info.njk / settling-in.njk / 404.njk
│   └── regions/region.njk                        # pagination over regions.json → /regions/<slug>/
│       regions/gyeonggi-do/population-decline-counties.njk
├── scripts/                    # verify-{eligibility,calculator,kto-client,normalize}.mjs
└── _site/                      # build output (gitignored)
```

Conventions: kebab-case files, `camelCase` JSON keys, one CSS file per component matching the
partial name, one JS module per interactive behaviour exporting a single `init()`. SVGs are
inlined via the `inlineSvg` shortcode so CSS can target their elements. `functions/**` imports
JSON bare — Cloudflare's Functions bundler rejects `with { type: "json" }`; Eleventy-side
`_data/*.js` may still use it.

## 5. KTO data flow (the compliance-critical part)

```
   Cloudflare env var (KTO key)
        │  server-side only, never in src/ or client bundle
        ▼
  functions/api/region/[slug]/{attractions,events}.js
        │  live call to EngService2 (areaBasedList2, searchFestival2) on cache miss/expiry
        ▼
  normalize.mjs (title split, http→https, HTML-entity strip, license filter)
        ▼
  Cloudflare edge cache (cf.cacheTtl): attractions ~24h, festivals/events ~4h
        ▼
  Region pages fetch these endpoints client-side (`region-data.js`) into skeleton mounts — a
  real, periodically-refreshed live call, never a git-committed snapshot.
```

Region/county **hero photos** and **dish photos** are the exception: hand-picked once (via KTO
PhotoGalleryService1 / EngService2 during the dev window, which counts toward call history —
Wikimedia Commons and the site author's own photos fill the rest of the dish set), then committed
as static files under `assets/img/hero/` and `assets/img/food/` — an editorial choice, not
something an API should pick per request.

Static/editorial `_data/*.json` (visa rules, cost of living, food, communities, transport)
bypasses this pipeline entirely — not KTO-sourced, no "live" requirement.

**Rate-limit note:** dev key is 1,000 calls/day; edge caching keeps actual KTO round-trips to
~one per TTL window per region/content-type, not one per visitor. KTO's optional "operating
account" isn't needed for compliance (regular dev-key history counts).

**Known KTO data quirks baked into `kto-client.mjs`/`normalize.mjs`:**
- v4 renumbered content types — attraction is `76`, not the old `12`.
- `areaBasedList2` is called with `arrange=P` (view-count order; undocumented but stable — the
  documented `Q` is modified-date order, not view-count).
- KTO files medical-tourism venues (clinics, hospitals, medical-tourism agencies) under
  `contentTypeId` 76. Proper attraction list has to be researched.
- `areacode` is empty on festival records — always filter by `lDongRegnCd`.
- Raw `items` is `""` on zero results, a bare object on one result, an array only at 2+ —
  `kto-client.mjs` always normalizes to an array.
- Images serve over `http://` — rewrite to `https://` to avoid mixed-content blocking.
- Titles are bilingual/messy, sometimes with nested parens
  (`"APAP Artwork Tour (APAP 작품투어 (안양공공예술프로젝트))"`) — split into `titleEn`/`titleKo`
  at the normalize step.
- `searchFestival2` frequently returns Korean `addr1`/`addr2` even though it's the English
  service. The UI shows a best-effort city extraction from it; the full address is on the copy
  control. No romanizer in the stack, so non-metro Korean city names stay in Hangul.
- `searchFestival2`'s `eventStartDate` filters by start date only, so an already-running festival
  needs an earlier query window filtered by `eventenddate` client-side (`isUpcomingOrOngoing`).
- Image licensing is per-record via `cpyrhtDivCd` (`Type1`, `Type3`, empty). Only render images
  with a known code, attribute per §1's fixed format, never crop or filter `Type3` assets.
- Some regions (e.g. Jeju, Jeollanam-do) currently have **zero upcoming festivals** in the live
  data — this needs a designed empty state, not a bug fix.
- City-level filtering adds `lDongSignguCd` (from the `ldongCode2` operation) alongside
  `lDongRegnCd` — live-confirmed to narrow `areaBasedList2` to one city. Stored on each `City` as
  `ktoLDongRegnCd`/`ktoLDongSignguCds[]`; empty array = city is its whole `lDongRegnCd` (the metro
  cities). Gwangju has no single signgu code inside merged region `"12"`, only its 5 gu's — fans
  out like a multi-code region.

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

Attraction    contentId, regionSlug, lDongRegnCd, titleEn, titleKo,
              summary, address, imageUrl, imageThumbUrl, imageLicense,
              lat, lng, sourceModifiedAt          // from KTO, via Functions proxy

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

Family accompaniment (spouse + minor children): capital area → ×2.0 regardless of age;
non-capital/decline area → ×1.5. Currency is KRW only. Other visa facts to surface on the
static visa-info page (not part of the calculator): ≥100M KRW health insurance required, age
18+ (dependents exempt), max stay 3 years (1yr + renewals), no local paid work, convertible
from B-1/B-2/C-3.

The "GNI × multiplier" column is MOJ's framing, not an exact formula: multiplying the *rounded*
`gniPerCapitaKrw` gives 78,615,000/104,820,000, off by ₩5,000–10,000 from the published
78,620,000/104,830,000 (MOJ used the unrounded GNI). `visaRules.json` stores the published
figures directly (`thresholdsByMultiplier`) instead of deriving them.

**County-level accuracy for population-decline areas (not simplified away):** the real rule's
non-capital bucket also includes specific counties on Korea's official 인구감소지역 (Population
Decrease Region) list, some of which sit administratively inside Gyeonggi-do. Blanket-treating
"Gyeonggi = capital tier" would misrepresent real eligibility for those counties, so this is
modeled explicitly rather than disclaimed away:

- `src/_data/populationDeclineAreas.json` holds the MOIS-designated county list (`mois.go.kr`,
  legal basis: 지방자치분권 및 지역균형발전에 관한 특별법 §2/시행령 §3, first designated 2021-10,
  5-year re-designation cycle). Two disjoint categories: 89 official 「인구감소지역」
  (`category: 'decline'`) + 18 「관심지역」(`category: 'watch'`). Trimmed to the 7 records inside
  `gyeonggi-do` — the only capital-tier region, so the only place this data changes an
  eligibility outcome; the full 107-record set is in `populationDeclineAreasFull.json` (not read
  by the build). Whether the 18 `'watch'` counties qualify too, or only the 89 `'decline'`, is
  unconfirmed (press-release wording is ambiguous) — modeled as the broader reading; ROADMAP
  Phase 29 tracks confirming with MOJ.
- Each `City` in `cities.json` carries `isPopulationDeclineArea`, `true` only for a Gyeonggi-do/
  Incheon workation city on the list (currently just `ganghwa`) — no eligibility meaning
  elsewhere, so `false` even where MOIS also designates the county (Gangneung, Andong, …).
- `eligibility.js` returns `'partial'` for a nominally capital-tier region containing at least
  one independently-qualifying decline county (today: `gyeonggi-do` only). Map/UI handling in §3.

## 8. State management

No library, no store. Three tiers:

1. **Local/DOM state** — burger open/closed, active tab. Lives in the owning module, expressed
   as a CSS class on one element.
2. **Shared state — exactly one piece:** `EligibilityResult`. Flow: `calculator.js` reads
   inputs → calls pure `eligibility.js` → `calculator.js` renders the result caption itself, and
   `main.js` glue calls `koreaMap.applyResult(result)` separately for the map state only.
   One-directional, ~10 lines of glue, no event bus, no separate `caption.js` module.
3. **Persistence** — the result is reflected in the URL only (`?salaryKrw=&age=&hasFamily=`,
   calculator.js), not stored client-side: reloading or sharing the link reproduces the same
   result, but navigating to a region page does not carry it — region pages don't read or
   remember a calculator run.

## 9. Responsive strategy

- Header/nav: one `<ul>` in the DOM at all times; `nav.js` toggles `[aria-expanded]` on the
  burger. Never render two navs. Burger under ~768px.
- Region info: two render modes swapped by a width-only 1120px media query — see §3.
- Region page Overview tab: cities list + event timeline are a 2-column grid ≥900px, stacked
  below that, cities first (primary answer to "where would I live"); Attractions and Local food
  render as stacked blocks below. Living Info is the only other tab (cost-of-living + transport).
- Horizontal scroll-snap lists (e.g. `.attraction-list`): CSS `scroll-snap-type: x mandatory` +
  `overflow-x: auto`, no carousel library, no JS required.
- Map: SVG with `viewBox` + `max-width: 100%`. Jeju has an invisible `.region__hit-target`
  ellipse padding its tap area to ≥44px at 360px width (its own shape alone is ~39px tall).
- Map labels: all 17 admin-division/city names render at every width — no narrow-viewport
  summary fallback.
- iOS Safari specifics: use `100svh`/`100dvh` not `100vh`, 16px input font-size to prevent
  focus-zoom, `-webkit-text-size-adjust: 100%`.
- Test matrix (CLAUDE.md rule 7) plus a width just above/below 1120px to check the
  infographic↔carousel switch.

## 10. Designated Task #4 alignment (for the eventual 기능설명서)

The task's hashtags **#workation #month-long-stay #2030s-youth #local-tourism** are the site's
vibe-tag vocabulary. Every major feature traces back to one:
- Eligibility calculator + map gating → sustainable-residency framing (not one-off tourism)
- Region living-info (cost of living, transport, workation cities) → month-long-stay support
- Attractions/festivals/food → local-tourism content, framed as "living here," not sightseeing
