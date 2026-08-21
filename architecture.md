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

- **OpenAPI use must be real and checkable.** The contest FAQ explicitly says: do not rely on
  local DB / committed-snapshot storage — judges verify actual call-history logs on the
  submitted key during the dev window (2026-07-27–09-21). This is why section 5 below uses a
  live proxy with short-TTL edge caching instead of a pure build-time fetch.
  Filed as a **deliberate, non-obvious architectural override** — a "no backend" static-site
  ideal would be simpler and would still work functionally, but would risk the 20/100-point
  data-usage criterion.
- Designated Task #4: "one-off tourism doesn't build sustainable resident population in
  declining regions." Hashtags to anchor features on: **#workation #month-long-stay
  #2030s-youth #local-tourism**. Every major feature should be traceable to one of these in the
  eventual 기능설명서 (functional spec submission).
- Submission needs one live URL. No app-store step, no login required for judges.
- Team size / eligibility not a technical concern (solo dev, already confirmed eligible).

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
| Fonts | Self-hosted **Pretendard** or system stack | Needed for Korean glyphs in place names; no Google Fonts CDN dependency. |

Total dependency footprint: `@11ty/eleventy` as the only direct npm dependency, zero
client-side libraries, one small serverless layer that ships with the hosting choice (not a
separate vendor).

**Rejected alternatives:** Astro (bigger dependency tree, faster breaking-change cadence than
11ty). A fully static/zero-build site (4 hand HTML files) — rejected because 6 region pages
would either duplicate markup or need client-side templating, and it can't satisfy the
live-API-call requirement at all.

## 3. UX decisions locked in

**Region info panel (map interaction):** a wide-viewport **static infographic layout** with
always-visible callouts, and a narrow-viewport **single dynamic card** — not a hover-triggered
floating popup in either case. The distinction that matters is not "desktop vs. mobile" but
**available width**: the infographic mode is driven by a width breakpoint (not a device or
orientation check), so it also applies to phones in landscape once they're wide enough, not
just desktop windows.

- **Wide viewport** (width breakpoint — start from ~700–768px and tune empirically during
  build against real landscape-phone widths, e.g. ~650–930px on common devices): all 6 region
  callouts render simultaneously, permanently visible, arranged around the map, each connected
  to its region by a static, hand-positioned leader line (plain SVG `<line>`/`<path>` — fixed
  coordinates, not computed at runtime). Each callout shows hashtags, cost-of-living snapshot,
  nomad score, "Learn more →". **Exact callout arrangement/positions are an implementation
  detail, left to the build phase**, not specified here.
  This is what makes it safe despite earlier concerns about floating info panels: those were
  about *dynamically* positioned, hover-triggered popups needing runtime collision math near
  map edges. A fixed, authored-once layout with a hard width-based mode switch has neither
  problem — nothing is recomputed on resize, because narrower viewports don't shrink this
  layout, they replace it entirely with the single-card mode below.
- **Narrow viewport** (below the same breakpoint — portrait phones): single column, one card
  renders in normal document flow directly below the map. Tap a region → card fills +
  smooth-scrolls into view. Navigation only via the explicit "Learn more →" link.
- Both modes render from the same region-card partial/template and the same per-region data —
  wide viewport just loops it 6 times into fixed slots instead of rendering it once dynamically.

**Hover/focus border highlight is a v1 requirement, not a nice-to-have,** in both modes:
- Wide viewport: hovering or focusing a region **or its callout** bolds/brightens that region's
  SVG border, its leader line, and its callout together, as one connected unit.
- Narrow viewport: tapping a region bolds/brightens its border the same way, alongside filling
  the single card.

**Eligibility-gated regions:** greyed-out (ineligible) regions are **not** clickable through to
their region page — doing so would misrepresent the eligibility gating that's the site's core
value proposition. In wide-viewport mode, a greyed region's callout permanently shows "Not
available at your current income/age input — adjust or clear filters to see all regions"
inline (no hover needed to discover it, since the callout is always visible anyway). In
narrow-viewport mode, the same message appears in the single card on tap. Gyeonggi-do
additionally has a **third, "partial"** visual state distinct from active/grey — see §7 for why
(it contains specific population-decline-designated counties that qualify at the lower income
threshold even when the rest of Gyeonggi doesn't). Partial regions remain clickable, since part
of them is genuinely eligible, and their callout/card explains the split.

**Seoul/Incheon:** absorbed into the Gyeonggi region page (one page, not three), but kept as
distinct labeled sub-shapes on the SVG map rather than merged into one blob, since they're
locally significant landmarks.

**Region → metro grouping** (confirmed):
```
gyeonggi-do    → Gyeonggi-do, Seoul, Incheon           [capitalArea: true]
gangwon-do     → Gangwon-do
chungcheong-do → Chungcheongbuk-do, Chungcheongnam-do, Daejeon, Sejong
gyeongsang-do  → Gyeongsangbuk-do, Gyeongsangnam-do, Busan, Daegu, Ulsan
jeolla-do      → Jeollabuk-do, Jeollanam-do, Gwangju
jeju-do        → Jeju-do
```

**Korea provinces SVG:** sourced — a public-domain per-province boundary SVG (17 first-tier
division shapes, `src/assets/svg/source/korea-provinces-blank.svg`, see its header comment for
provenance).

## 4. Folder structure

```
worknstay_korea/
├── .env                        # KTO key for local dev only — read by scripts/ and Functions env
├── .nvmrc
├── package.json / package-lock.json
├── eleventy.config.js
├── eleventy/
│   └── event-calendar.mjs      # build-time month-grid date math (Eleventy shortcode)
├── CLAUDE.md
├── architecture.md
├── SCAFFOLDING_TODO.md
├── ROADMAP_TODO.md
├── functions/
│   └── api/
│       ├── region/[slug]/attractions.js   # live KTO call, edge-cached (short TTL)
│       ├── region/[slug]/events.js        # live KTO call, edge-cached (short TTL)
│       ├── region/[slug]/gallery.js       # live KTO call, edge-cached (long TTL)
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
│   │   ├── populationDeclineAreas.json  # MOIS 인구감소지역 list (§7/§11)
│   │   └── mock/{attractions,events,gallery}.json  # KTO-shaped fixtures; the dev-only fallback
│   │                            # once functions/api/** makes real live calls
│   ├── _includes/
│   │   ├── layouts/{base,page}.njk
│   │   └── partials/{header,footer,region-card,korea-map,tabs,event-calendar,empty-state}.njk
│   ├── assets/
│   │   ├── css/  tokens.css, base.css, components/*.css
│   │   ├── js/   main.js, nav.js, calculator.js, eligibility.js,
│   │   │         korea-map.js, region-card.js, tabs.js
│   │   ├── img/  hero/, food/, og/  # planned subfolders; empty until real assets are sourced
│   │   ├── fonts/               # empty until a real webfont is added
│   │   └── svg/  korea-regions.svg
│   │              source/korea-provinces-blank.svg  # raw Wikimedia source (public domain)
│   ├── index.njk               # home
│   ├── visa-info.njk
│   ├── communities.njk
│   ├── 404.njk
│   └── regions/region.njk      # pagination over regions.json → /regions/<slug>/
└── _site/                      # build output (gitignored)
```

Conventions: kebab-case files, `camelCase` JSON keys, one CSS file per component matching the
partial name, one JS module per interactive behaviour exporting a single `init()`.

## 5. KTO data flow (the compliance-critical part)

```
   Cloudflare env var (KTO key)
        │  server-side only, never in src/ or client bundle
        ▼
  functions/api/region/[slug]/{attractions,events,gallery}.js
        │  live call to EngService2 (areaBasedList2, searchFestival2, detailImage2)
        │  on cache miss/expiry
        ▼
  normalize.mjs (title split, http→https, HTML-entity strip, license filter,
                 lDongRegnCd → region slug)
        ▼
  Cloudflare edge cache (Cache API), TTL by volatility:
    - attractions: ~24h        (near-static content)
    - festivals/events: ~1–6h  (changes more, and this is the thin/sparse dataset)
    - hero gallery images: ~7–30 days (effectively "prefetched," but still a live path)
        ▼
  Region page (11ty-rendered shell) fetches these endpoints — either at request time via a
  tiny client-side fetch() populating a skeleton, or the Function itself is what the browser
  hits directly for that section. Either way, the response comes from a real, periodically-
  refreshed live call, not a git-committed snapshot.
```

Static/editorial `_data/*.json` (visa rules, cost of living, food, communities, transport)
bypasses this pipeline entirely — it was never framed as KTO-sourced and has no compliance
requirement to be "live."

**Rate-limit note:** dev key is 1,000 calls/day; edge caching keeps actual KTO round-trips to
roughly one per TTL window per region/content-type, not one per visitor — this is what keeps
both the quota and the page speed safe even under real traffic. Applying for KTO's optional
"operating account" for one representative API is not required for compliance (call history
from the regular dev key counts) — consider it only if traffic volume later demands headroom.

**Known KTO data quirks to bake into `normalize.mjs`:**
- v4 renumbered content types — attraction is `76`, not the old `12`.
- `areacode` is empty on festival records — always filter by `lDongRegnCd`.
- Images serve over `http://` — rewrite to `https://` to avoid mixed-content blocking.
- Titles are bilingual/messy (`"5.16 Tree Tunnel (Road 5.16 Forest Tunnel) (5.16도로숲터널)"`) —
  split into `titleEn`/`titleKo` at the normalize step.
- `overview` fields contain raw HTML entities/tags — decode and strip at the normalize step,
  never `innerHTML` raw KTO text.
- Image licensing is per-record via `cpyrhtDivCd` (`Type1`, `Type3`, empty). Only render images
  with a known code, always attribute ("Data from the Korea Tourism Organization"), never crop
  or filter `Type3` (no-derivative-works) assets.
- Some regions (e.g. Jeju, Jeollanam-do) currently have **zero upcoming festivals** in the live
  data — this needs a designed empty state, not a bug fix.

## 6. Data models (mock-data-ready)

```
Region        slug, nameEn, nameKo, svgGroupId, centroid{x,y},
              isCapitalArea, ktoLDongRegnCds[], ktoAreaCodes[],
              vibeTags[], nomadScore, shortIntro, longIntro,
              heroImageIds[], costOfLivingKey

City          slug, regionSlug, nameEn, nameKo, lat, lng, blurb,
              workationCenters[{ name, url, note }]

Attraction    contentId, regionSlug, lDongRegnCd, titleEn, titleKo,
              summary, address, imageUrl, imageThumbUrl, imageLicense,
              lat, lng, sourceModifiedAt          // from KTO, via Functions proxy

Event         contentId, regionSlug, lDongRegnCd, titleEn, titleKo,
              startDate, endDate, address, imageUrl, imageLicense,
              tel, homepageUrl                     // from KTO, via Functions proxy

Dish          regionSlug, nameEn, nameKo, romanized, imagePath,
              caption, credit                      // static

CostOfLiving  regionSlug, currency, asOf, source, sourceUrl,
              rent1brCityCentre, monthlyBudgetSingle, mealInexpensive,
              transitPass, utilities, indexVsSeoul // static, hand-curated snapshot

Transport     regionSlug, airports[{name, iata, note}], railNote,
              intercityBusNote, localTransitNote, carRecommended:bool

NatureActivity  regionSlug, name, type, difficulty, season, url   // stretch, likely last-cut
                                                                    // if time is short (§11)

VisaRules     version, effectiveFrom, gniReferenceYear, gniPerCapitaKrw, currency: 'KRW',
              sourceUrl, disclaimer,
              ageBands[{ minAge, maxAge, multiplierCapitalArea, multiplierNonCapitalArea }],
              familyMultiplier{ capitalArea, nonCapitalArea }

PopulationDeclineArea   countyNameEn, countyNameKo, provinceSlug, metroEn,
                        category: 'decline' | 'watch'
                        // populationDeclineAreas.json: working file, gyeonggi-do only (the
                        //   only capital-tier region — elsewhere the flag can't change
                        //   eligibility). populationDeclineAreasFull.json: full 107-record
                        //   nationwide backup, not read by the build. See §7.

EligibilityResult   tier: 'ineligible' | 'nonCapitalOnly' | 'all'
                    dimmedRegionSlugs[], partialRegionSlugs[]
                    thresholdCapitalKrw, thresholdNonCapitalKrw
                    gapToNonCapitalKrw, gapToCapitalKrw
                    // tier stays 3-way — partiality is per-region, not a 4th tier. A region is
                    // in partialRegionSlugs (not dimmedRegionSlugs) when it's nominally
                    // capital-tier but contains population-decline-designated counties that
                    // independently qualify — see §7. Currently only relevant to gyeonggi-do.
                    // Two separate gap fields, not one: in the nonCapitalOnly tier the useful
                    // caption is "how much more to unlock the capital area," which a single
                    // gap-to-whatever-you-haven't-cleared field can't express on its own.
```

`VisaRules` is **JSON data, not JavaScript** — `eligibility.js` is a pure function
`(userInput, referenceData) → EligibilityResult`, where `userInput` is
`{ salaryKrw, age, hasFamily }` and `referenceData` is `{ rules, regions,
populationDeclineAreas }`. No DOM access, trivially testable
(`scripts/verify-eligibility.mjs`). Thresholds update by editing `visaRules.json` when the
government reissues the annual GNI figure — no code change needed.

`Region.nameKo` exists from day one even though v1 ships English-only, both so users can
cross-reference Naver Map by Korean place name, and to make a future `ja`/`zh` locale additive
rather than a refactor.

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

**County-level accuracy for population-decline areas (not simplified away):** the real rule's
non-capital bucket also includes specific counties on Korea's official 인구감소지역 (Population
Decrease Region) list, some of which sit administratively inside Gyeonggi-do. Blanket-treating
"Gyeonggi = capital tier" would misrepresent real eligibility for those counties, so this is
modeled explicitly rather than disclaimed away:

- `src/_data/populationDeclineAreas.json` holds the MOIS-designated county list, sourced live
  2026-08-18 (`mois.go.kr`, legal basis: 지방자치분권 및 지역균형발전에 관한 특별법 §2/시행령 §3,
  first designated 2021-10, 5-year re-designation cycle). Two categories: 89 official
  「인구감소지역」(`category: 'decline'`) + 18 「관심지역」(`category: 'watch'`), confirmed disjoint.
  Trimmed to the 7 records inside `gyeonggi-do` — the only capital-tier region, so the only
  place this data can change an eligibility outcome. The full 107-record nationwide set lives in
  `populationDeclineAreasFull.json` (not read by the build) in case scope broadens later.
  Whether `'watch'` counties genuinely qualify for the lower threshold, or only the 89 `'decline'`
  counties do, is unconfirmed — the visa press release's wording ("인구감소(관심)지역") supports
  both readings. Modeled here as the broader reading (include now, narrow later if wrong).
- Each `City` in `cities.json` carries `isPopulationDeclineArea`, `true` only for a Gyeonggi-do/
  Incheon workation city on the list above (currently just `ganghwa`) — it has no eligibility
  meaning outside Gyeonggi-do, so it's left `false` elsewhere even where MOIS also designates
  the county (e.g. Gangneung, Andong — see `populationDeclineAreasFull.json`).
- `eligibility.js` gains a third outcome: a region is `'partial'` (not simply active/grey) when
  it's nominally capital-tier but contains at least one population-decline county that
  independently qualifies at the lower threshold. Today this only applies to `gyeonggi-do`.
- Map gets a third visual state (`.region--partial`, e.g. hatched fill, distinct from both
  active and greyed) with a tooltip: "Only these designated counties qualify: [county list] —
  click to see them," linking into the Gyeonggi region page with those specific cities called
  out/highlighted.
- If the sourced list turns out to have zero overlap with any workation-centre city we track,
  this degrades gracefully to the original binary active/grey behavior — the `'partial'` tier
  simply never triggers. No wasted structure either way.

## 8. State management

No library, no store. Three tiers:

1. **Local/DOM state** — burger open/closed, active tab. Lives in the owning module, expressed
   as a CSS class on one element.
2. **Shared state — exactly one piece:** `EligibilityResult`. Flow: `calculator.js` reads
   inputs → calls pure `eligibility.js` → `calculator.js` renders the result caption itself, and
   `main.js` glue calls `koreaMap.applyResult(result)` separately for the map state only.
   One-directional, ~10 lines of glue, no event bus, no separate `caption.js` module.
3. **Persistence** — write the result to `sessionStorage` so a user returning from a region
   page doesn't lose their calculator result; region pages can read it to show a small
   "available to you" badge.

## 9. Responsive strategy

- Header/nav: one `<ul>` in the DOM at all times; `nav.js` toggles `[aria-expanded]` on the
  burger. Never render two navs. Burger under ~768px.
- Region info: two render modes swapped by a width-only media query (see §3) — 6 static
  callouts above the breakpoint (covers desktop and wide/landscape phones), 1 dynamic card
  below it (portrait phones). This is the one boundary decision that matters most for the
  homepage; the breakpoint value itself needs empirical tuning against real landscape-phone
  widths during build, not just standard device presets.
- Region page Overview tab: cities list + event calendar are a 2-column grid ≥900px, stacked
  below that, cities first (primary answer to "where would I live"); Attractions and Local food
  render as further stacked blocks below the grid, inside the same tab (Living Info is the only
  other tab, holding just cost-of-living + transport).
- Horizontal scroll-snap lists (e.g. `.attraction-list`): CSS `scroll-snap-type: x mandatory` +
  `overflow-x: auto`, no carousel library, no JS required. (A standalone Gallery UI — a separate
  `gallery.njk`/`gallery.css`/a `gallery.js` module for desktop-only arrow buttons — was removed:
  no template ever wired it in after Attractions absorbed this horizontal-scroll pattern instead.
  `mock.gallery` data and the `functions/api/region/[slug]/gallery.js` endpoint are unaffected;
  arrow-button controls are not planned anywhere and should be treated as cut, not deferred.)
- Map: SVG with `viewBox` + `max-width: 100%`. Jeju has an invisible `.region__hit-target`
  ellipse padding its tap area to ≥44px at 360px width (its own shape alone is ~39px tall).
- Map labels: all 17 admin-division/city names render at every width — no narrow-viewport
  summary fallback.
- iOS Safari specifics: use `100svh`/`100dvh` not `100vh`, 16px input font-size to prevent
  focus-zoom, `-webkit-text-size-adjust: 100%`.
- Test matrix: 360 / 768 / 1280px **plus at least one landscape-phone width (~700–850px)** to
  verify the infographic mode actually reads well there, not just on desktop, + a real iPhone
  Safari pass (both orientations) before calling a feature done.

## 10. Designated Task #4 alignment (for the eventual 기능설명서)

Adopt or closely adapt the task's suggested hashtags as the site's actual vibe-tag vocabulary:
**#workation #month-long-stay #2030s-youth #local-tourism**. Every major feature should trace
back to one of these:
- Eligibility calculator + map gating → sustainable-residency framing (not one-off tourism)
- Region living-info (cost of living, transport, workation cities) → month-long-stay support
- Attractions/festivals/food → local-tourism content, but framed as "living here," not
  sightseeing checklists

## 11. Open, non-blocking gaps (known, deliberately deferred)

- **Population-decline-designated county list not yet sourced** (see §7) — needed before the
  calculator/map can be built accurately.
- Workation-centre city list has no canonical source yet — ship v1 with a small hand-curated
  set per region, expand later (pure data change, no architecture impact).
- Nomad score is a static editorial number for v1 (real scoring pipeline is a separate future
  sub-project/repo) — just a plain field on `Region`, swappable later without a schema change.
  This one is a settled decision, not just a deferral.
- Nature activities / Go Camping API integration — leaning toward cutting this if time is
  short, not yet a final decision.
- Custom domain not yet secured — the `*.pages.dev` Cloudflare Pages URL satisfies the
  contest's live-URL requirement either way; whether to get a custom domain at all is still
  open, independent of the contest deadline.
