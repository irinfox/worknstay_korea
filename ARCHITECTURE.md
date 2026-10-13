# Work&Stay Korea — Architecture

Technical reference: stack, data, pipelines, and the decisions behind them.

## 0. What this site is

An English-language site helping F-1-D (Digital Nomad Visa) applicants choose a Korean region to
settle in; see `README.md` for the full description.

Built for the [2026 관광데이터 활용 공모전](https://api.visitkorea.or.kr/#/cntSearchDetail?no=3),
②-2 웹·앱 구현 부문, **Designated Task #4**: 단순 흥미 위주 일회성 관광의 한계 및 인구 감소 지역의
지속 가능한 생활인구 유입 대책 부족 ("The limits of superficial, one-off tourism and the lack of
strategies to attract a sustainable flow of long-term visitors to depopulating regions").

## 1. Contest constraints that shape this architecture

- **OpenAPI use must be real and checkable.** The FAQ rules out committed-snapshot storage —
  judges check call-history logs on the submitted key. §5 uses a live proxy instead of a
  build-time fetch.
- **Attribution is fixed by the FAQ**: plain text naming the institution — never a CI/BI logo,
  never "TourAPI" alone. Rendered as "Source: © Korea Tourism Organization (한국관광공사)." on
  every `.data-provenance`/photo-credit line.

## 2. Tech stack and why

| Layer | Choice | Why |
|---|---|---|
| Site generator | **Eleventy (11ty) v3** | Static output, one dependency, no build chain; slow, deliberate version cadence. |
| Templating | **Nunjucks** (built into 11ty) | Kills header/footer duplication; `pagination` generates all 6 region pages from one `regions.json`. |
| Styling | **Hand-written CSS**, custom properties, Grid/Flexbox, `clamp()` | Zero build step. Tailwind rejected — its v3→v4 break is the exact churn this stack avoids. |
| Client JS | **Vanilla ES modules, no libraries** | Debuggable by reading it, no framework runtime to go stale. |
| Map | **Inline SVG**, 6 region groups | No Leaflet/Mapbox/map-tile API key. States are CSS classes, hit targets are real `<a>`. |
| **External-API data** | **Cloudflare Pages Functions** (`functions/api/*`): KTO (attractions, festivals) and Kakao® Local (study-café counts) | Satisfies "checkable API use"; keys stay server-side. |
| **Static/editorial data** | Build-time data in `src/_data/`, hand-authored | Visa rules, rent, food, settling-in guide aren't API-sourced — no live-call need. |
| Hosting | **Cloudflare Pages** (+ Functions) | One vendor for hosting + proxy. |
| Analytics | **Cloudflare Web Analytics** | Free, cookieless, no consent banner; enabled in the Pages dashboard (beacon injected at the edge, nothing in the repo). |
| Fonts | **Instrument Sans + Noto Sans KR** via one Google Fonts `<link>` | Per DESIGN.md; Noto Sans KR covers Hangul place names. |

**Rejected:** Astro (heavier tree, faster breaking-change cadence).

## 3. UX decisions locked in

**Region info panel:** two modes swapped by a **width-only** breakpoint (`--bp-region-info-wide`
in `tokens.css`, mirrored in `region-card.js`/`region-card.css`) — never a hover-triggered popup
(bug-prone: edge clipping, z-index, mobile focus-trap). Width-only so wide landscape phones get
the infographic too. Both modes render from the same region-card partial.
- **Wide:** all 6 callouts at once around the map, each joined to its region by a static
  hand-positioned SVG leader line (fixed viewBox coords, never computed at runtime). Regions are
  assigned to a west or east column, ordered north to south (`index.njk`); the Jeju leader line
  is hidden in the narrow part of the range, where it would collide with the callouts.
- **Narrow:** map above a scroll-snap carousel of all 6 cards + dots; tapping a region scrolls
  to its card. Every card is a real link, so it works without JS.

**Eligibility-gated regions:** greyed-out regions aren't clickable — showing them as navigable
would misrepresent the visa gating, the core value prop. Gating is link-only (href stripped from
the map shape and the card's "Open <region> →" link); the *why* lives in the calculator caption and map
legend.

**Partial state (Gyeonggi-do):** a nominally capital-tier region with population-decline counties
(§7) gets a distinct fill and a "Partly eligible" note plate; its map and card links are
re-pointed to `/regions/gyeonggi-do/population-decline-areas/` (`pointLinkTo` in `korea-map.js`).

**Region → metro grouping:**
```
gyeonggi-do    → Gyeonggi-do, Seoul, Incheon           [isCapitalArea: true]
gangwon-do     → Gangwon-do
chungcheong-do → Chungcheongbuk-do, Chungcheongnam-do, Daejeon, Sejong
gyeongsang-do  → Gyeongsangbuk-do, Gyeongsangnam-do, Busan, Daegu, Ulsan
jeolla-do      → Jeollabuk-do, Jeollanam-do, Gwangju
jeju-do        → Jeju-do
```
Metro cities have no pages of their own; they live on their region's page. The national map draws
them as distinct `.region__city` shapes.

**National map SVG** (`src/assets/svg/korea-regions.svg`, simplified from a public-domain
per-province SVG in `source/`). The structure is a contract — `korea-map.njk` inlines it by that
filename and `korea-map.js applyResult()` keys off `data-slug`:
```
<a class="region" data-slug="<slug>" href="/regions/<slug>/">
  <g id=…>  .region__shape | .region__city (metro shapes) | .region__label
```
Jeju keeps its true geographic distance (sea-tinted background, not an inset) — deliberate.
Size budget ≤65KB (it's inlined into the homepage). **Region detail maps** (`src/assets/svg/*-detail-map.svg`, cut from the
national map) are inlined per region page with pins for cities and some attractions; labels that
would crowd the map are revealed on hover/tap (`region-detail-map.js`).

## 4. Folder structure

```
functions/api/      region/[slug]/{attractions,events}.js   KTO proxies
                    city/[slug]/study-cafes.js              Kakao® proxy
                    lib/                                    API clients, normalizers, region/city maps
src/_data/          editorial data and API fallbacks (§6)
src/_includes/      layouts/ + partials/ (region-card, city-card, korea-map, hero, …)
src/assets/         css/ (tokens, base, components/), js/ (one module per behaviour),
                    img/ (committed photos, credited per `_data/*Credits.json`), svg/ (national + detail maps)
src/regions/        region.njk paginates regions.json → /regions/<slug>/;
                    gyeonggi-do/population-decline-areas.njk is hand-authored
scripts/            verify-*.mjs checks and one-off data investigations
```

Conventions: kebab-case files, `camelCase` JSON keys; component CSS lives in `css/components/`,
usually named after its partial; one JS module per interactive behaviour. SVGs inline via the
`inlineSvg` shortcode so CSS can target their elements. `functions/**` imports JSON bare —
Cloudflare's Functions bundler rejects `with { type: "json" }`; Eleventy-side `_data/*.js` may
still use it. Dev secrets (`KTO_API_KEY`, `KAKAO_REST_API_KEY`) live in `.dev.vars`; `.env` is
for `scripts/*` (`node --env-file=.env`).

## 5. External-API data flow (the compliance-critical part)

```
   Cloudflare env vars (KTO key, Kakao® key)
        │  server-side only, never in src/ or client bundle
        ▼
  functions/api/region/[slug]/{attractions,events}.js   → KTO EngService2 on every request
  functions/api/city/[slug]/study-cafes.js              → Kakao® Local on every request
        ▼
  normalize.mjs (title split, http→https, HTML-entity strip, license filter)
        ▼
  Pages fetch these endpoints client-side (`region-data.js`, `study-cafes.js`) into skeleton
  mounts — a real, live call on every visit, never a git-committed snapshot.
```

**Caching: none in production.** KTO's compliance check is the key's call-history log, and
caching needs a separate approval; an edge-cache hit would show as a gap in that log. A dev-only
in-memory cache (`KTO_DEV_CACHE=1` in `.dev.vars`) covers manual QA; `KTO_DEV_FORCE_QUOTA`
simulates quota exhaustion.

**Quotas:**
- **KTO:** per endpoint, not total — `areaBasedList2` (attractions) and `searchFestival2`
  (festivals) are counted separately. Dev key 1,000 calls/day per endpoint; an operating account
  with 100,000/day per endpoint is requested. The worst region (gyeongsang-do, 5 `lDongRegnCd`
  codes) costs ~15 attractions calls (3 per code) plus 5 festival calls per page view; the
  average across the 6 regions is ~8 attractions plus ~3 festival calls (16 codes in total).
- **Kakao®:** 100,000 calls/day free for a first app
  ([quota docs](https://developers.kakao.com/docs/en/getting-started/quota)).

**Quota-exceeded handling:** attractions serve the region's `topAttractions.json` picks with
`quotaExceeded: true` (the client swaps the section subtitle to "Top picks for today"); events
return `[]` with a "come back tomorrow" message — a point-in-time snapshot would show stale
dates.

**No key (local dev):** attractions and events serve `topAttractions.json` /
`eventsSnapshot.json` with `fallback: true`, so the UI can be tested with zero live calls; for
events the client also swaps the provenance line to say it's a saved sample.

Fan-out orchestration lives in `attraction-fetch.mjs` so Node scripts can import it.

**Static exceptions:** region/county **hero photos** and **dish photos** are hand-picked once
(KTO PhotoGalleryService1/EngService2, Wikimedia Commons, own photos), then committed under
`assets/img/` — an editorial choice, not something an API should pick per request. Editorial
`_data` bypasses the pipeline entirely.

**Kakao® study cafés:** `GET /api/city/[slug]/study-cafes` →
`{count, estimated, level, label}` or `{degraded, retryable, reason}`. `Cache-Control: no-store`
(Kakao® terms forbid caching or storing results). Results are filtered by address rules from
`cities.json` `studyCafeSearch`; above Kakao®'s 45-result cap the count is scaled from
`total_count`. The client is all-or-nothing per page and falls back to the editorial
`otherWorkspaces[].fallbackLevel`; level thresholds live in `studyCafeLevels.json`.

**Attraction ordering:** the server orders per region (`CATEGORY_PRIORITY`); a per-city override
applies client-side only while that city's filter is active (`CITY_CATEGORY_PRIORITY`), because
the server emits one array and per-city order would otherwise leak into "All". Attractions
without a photo are dropped.

**Known KTO quirks** (baked into `kto-client.mjs`/`normalize.mjs`):
- `areaBasedList2` uses undocumented `arrange=P` (view-count); `Q` (modified-date) buries
  landmarks. If the first fan-out call comes back genuinely empty (not 429 code 22), the fan-out
  switches to `arrange=R`. `{ items, quotaExceeded }` distinguishes quota from a true empty.
- `topAttractions.json` (hand-verified, per region) is boosted into live results
  (`boost-curated.mjs`): `hard` picks are injected if missing, `soft` picks only repositioned.
- Attractions: 3 broad calls per `lDongRegnCd` (`lclsSystm1=NA/VE/HS`, `numOfRows: 250`),
  reclassified in the Function (after KTO responds) into curated `lclsSystm2/3` codes
  (`cat1/2/3` under-surfaced popular sites). `contentTypeId` is never sent; selection is by
  the `lclsSystm` classification only. Cheaper than one call per sub-code.
- Cities are tagged after the fetch by matching each item's `lDongSignguCd` against
  `cities.json` (`ktoLDongRegnCd`/`ktoLDongSignguCds[]`; empty = whole `lDongRegnCd`); the city
  filter itself is client-side visibility, with no extra KTO calls. Gwangju's merged region
  `"12"` has no single signgu code, so it lists its 5 gu codes.
- `areacode` is empty on festival records — always filter by `lDongRegnCd`.
- Raw `items` is `""` on zero results, a bare object on one, an array at 2+ — always normalized
  to an array.
- Images serve over `http://` — rewritten to `https://` (mixed content).
- Titles are bilingual/messy — split into `titleEn`/`titleKo` at normalize.
- `searchFestival2` often returns Korean `addr1`/`addr2` — UI shows best-effort city extraction,
  full address on the copy control; no romanizer in the stack.
- `searchFestival2` with `eventStartDate` = today already excludes ended festivals — no lookback
  or client-side end-date filter.
- Image licensing is per-record via `cpyrhtDivCd` (`Type1`, `Type3`, empty) — render only known
  codes, never crop/filter `Type3`. `firstimage`/`firstimage2` can 404 independently;
  `setupImageFallback` swaps to the other URL, then the placeholder.
- A region can have zero upcoming festivals, so every festival block needs a designed empty state.

**Rejected:** `locationBasedList2` as a quota fallback — no clean coverage for multi-province
regions; `topAttractions.json` already covers it.

## 6. Data models

**Editorial data** (`src/_data/`; the files are the schema):
- `site.json`, `regions.json` — site settings; the 6 regions; `cities.json` — workation cities (KTO codes, workspaces,
  study-café search rules, getting around), joined to regions via `regionSlug`.
- `visaRules.json`, `populationDeclineAreas.json`, `populationSource.json` — visa thresholds,
  Gyeonggi-do decline counties and their source line (§7). `populationDeclineAreasFull.json` is
  the full MOIS list, unread by the build.
- `rentalMarketScan.js`, `settlingIn.json`, `food.json` — rent research, settling-in guide, dishes.
- `studyCafeLevels.json` — level thresholds for Kakao® counts; `*Hero{Photos,Credits}.json` —
  cover photos and credits; `topAttractions.json` / `eventsSnapshot.json` — fallbacks (§5).

**Computed shapes** (`Attraction`/`Event` built by `normalize.mjs`, `EligibilityResult` by `eligibility.js`; no data file):
```
Attraction  contentId, regionSlug, lDongRegnCd, lDongSignguCd, titleEn, titleKo, summary,
            address, imageUrl, imageThumbUrl, imageLicense, lat, lng,
            category: 'nature' | 'culture', citySlug | null, sourceModifiedAt, priority?
Event       contentId, regionSlug, lDongRegnCd, titleEn, titleKo, startDate, endDate,
            address, imageUrl, imageLicense, tel, homepageUrl
EligibilityResult   tier: 'ineligible' | 'nonCapitalOnly' | 'all'
            dimmedRegionSlugs[], partialRegionSlugs[],
            thresholdCapitalKrw, thresholdNonCapitalKrw, gapToNonCapitalKrw, gapToCapitalKrw
```

Invariants:
- `Region`/`City` carry both `nameEn` and `nameKo`; attractions and events carry `titleEn`/`titleKo`.
- `lDongRegnCd` is the canonical KTO key.
- `eligibility.js` is a pure function `(userInput, referenceData) → EligibilityResult`
  (`userInput = { salaryKrw, age, hasFamily }`), no DOM, tested via
  `scripts/verify-eligibility.mjs`. `referenceData` is pre-assembled at build time in
  `_data/eligibilityReferenceData.js` and embedded as a JSON island. Thresholds change by
  editing `visaRules.json` — no code change.

## 7. Visa eligibility rules

Thresholds and visa facts live in `visaRules.json` (rendered by `visa-info.njk`). Decisions:
- Published thresholds are stored, not derived — multiplying the rounded GNI is off by ₩5–10k.
- Population-decline counties are modelled at county level (`populationDeclineAreas.json`,
  Gyeonggi-do only — the one capital-tier region); `'watch'` counties count as qualifying, since
  MOJ's wording is ambiguous (disclosed on the visa page).
- Partiality is per-region (`partialRegionSlugs`), not a 4th tier. UI in §3.

## 8. State management

No library, no store. Three tiers:

1. **Local/DOM state** — burger open/closed, page-contents strip. Lives in the owning module as
   a CSS class on one element.
2. **Shared state — exactly one piece:** `EligibilityResult`. `calculator.js` reads inputs →
   calls pure `eligibility.js` → renders its own result caption; `main.js` passes
   `koreaMap.applyResult` into `initCalculator` as a callback for the map. One-directional, no
   event bus.
3. **Persistence** — none. Inputs and result live in the page only (`autocomplete="off"`, nothing
   in the URL or storage), so reload starts empty. Region pages don't read a calculator run.
