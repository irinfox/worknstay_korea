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
  never "TourAPI" alone. Shown as "Source: © Korea Tourism Organization (한국관광공사)." on
  every KTO-derived block.

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

**No CSP (deliberate).** No third-party scripts except Cloudflare's injected analytics beacon; no
user input shown to other visitors. Framing and permissions are set in `src/_headers`, HSTS in the
Cloudflare dashboard. Revisit if third-party scripts, accounts or URL state are added.

## 3. UX decisions locked in

**Region info panel:** two modes swapped by a **width-only** breakpoint (`--bp-region-info-wide`
in `tokens.css`, mirrored in `region-card.js`/`region-card.css`) — never a hover-triggered popup
(bug-prone: edge clipping, z-index, mobile focus-trap). Both modes render from the same
region-card partial.
- **Wide:** all 6 callouts at once around the map, each joined to its region by a static
  hand-positioned SVG leader line (fixed viewBox coords, never computed at runtime). Regions are
  assigned to a west or east column, ordered north to south (`index.njk`); the Jeju leader line
  is hidden in the narrow part of the range, where it would collide with the callouts.
- **Narrow:** map above a scroll-snap carousel of all 6 cards (dots: see DESIGN.md "Mobile");
  tapping a region scrolls to its card. Every card is a real link, so it works without JS.

**Eligibility-gated regions:** greyed-out regions aren't clickable — showing them as navigable
would misrepresent the visa gating, the core value prop. Gating is link-only (href stripped from
the map shape and the card's "Open <region> →" link); the *why* lives in the calculator caption
and map legend.

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
Size budget ≤65KB (it's inlined into the homepage).

**Region detail maps** (`src/assets/svg/*-detail-map.svg`, cut from the national map) are
inlined per region page with pins for cities and some attractions; labels that would crowd the
map are revealed on hover/tap (`region-detail-map.js`).

## 4. Folder structure

```
functions/api/      region/[slug]/{attractions,events}.js   KTO proxies
                    city/[slug]/study-cafes.js              Kakao® proxy
                    lib/                                    KTO/Kakao clients, normalizers,
                                                            region/city maps, attraction fan-out
                                                            + top-picks boost
src/_data/          editorial data and API fallbacks (§6)
src/_includes/      layouts/ + partials/ (region-card, city-card, korea-map, hero, …)
src/assets/         css/ (tokens, base, components/), js/ (one module per behaviour),
                    img/ (committed photos, each credited), svg/ (national + detail maps)
src/regions/        region.njk paginates regions.json → /regions/<slug>/;
                    gyeonggi-do/population-decline-areas.njk is hand-authored
scripts/            verify-*.mjs checks and one-off data investigations
```

Conventions: kebab-case files, `camelCase` JSON keys; component CSS lives in `css/components/`,
usually named after its partial; one JS module per interactive behaviour. SVGs inline via the
`inlineSvg` shortcode so CSS can target their elements. `functions/**` imports JSON bare —
Cloudflare's Functions bundler rejects `with { type: "json" }`; Eleventy-side `_data/*.js` may
still use it. Dev secrets (`KTO_API_KEY`, `KAKAO_REST_API_KEY`) live in one gitignored `.env`,
read by `wrangler pages dev` and by `scripts/*` (`node --env-file=.env`).

## 5. External-API data flow (the compliance-critical part)

```
   Cloudflare env vars (KTO key, Kakao® key)
        │  server-side only, never in src/ or client bundle
        ▼
  functions/api/region/[slug]/{attractions,events}.js   → KTO EngService2 on every request
  functions/api/city/[slug]/study-cafes.js              → Kakao® Local on every request
        ▼
  KTO: normalize.mjs (title split, http→https, HTML-entity strip, license filter)
        ▼
  Pages fetch these endpoints client-side (`region-data.js`, `study-cafes.js`) into skeleton
  mounts — a real, live call on every visit, never a git-committed snapshot.
```

**Caching: none in production.** KTO's compliance check is the key's call-history log, and
caching needs a separate approval; an edge-cache hit would show as a gap in that log. A dev-only
in-memory cache (`KTO_DEV_CACHE=1` in `.env`) covers manual QA; `KTO_DEV_FORCE_QUOTA`
simulates quota exhaustion.

**Quotas:**
- **KTO:** per endpoint, not total — `areaBasedList2` (attractions) and `searchFestival2`
  (festivals) are counted separately. Dev key 1,000 calls/day per endpoint. The worst region
  (gyeongsang-do, 5 `lDongRegnCd` region codes) costs ~15 attractions calls (3 per region code)
  and 5 festival calls per page view; the average region is ~8 attractions and ~3 festival
  calls.
- **Kakao®:** 100,000 calls/day free for a first app
  ([quota docs](https://developers.kakao.com/docs/en/getting-started/quota)).

**Fallbacks:** when any live KTO attractions call fails (quota exhausted included), attractions serve the region's
`topAttractions.json` picks. Events show the failed message when every slice fails (a partial
failure shows the items that came back) and return empty on quota — the events snapshot is never a
production fallback, since its dates would be out of date. With no key (local dev), both serve their files
(`topAttractions.json`, `eventsSnapshot.json`), so the UI can be tested with zero live calls.

**Static exceptions:** region/county **hero photos** and **dish photos** are hand-picked once
(KTO PhotoGalleryService1/EngService2, Wikimedia Commons, own photos), then committed under
`assets/img/` — an editorial choice, not something an API should pick per request. Editorial
`_data` bypasses the pipeline entirely.

**Credits and source lines** come from data, never template text: static content carries its own
in its `_data` file, live-API sources live in `sources.json`. A photo without a credit is skipped
with a build warning; the build fails only if that leaves a slot empty (home hero, county card,
region hero or food gallery).

**Kakao® study cafés:** `GET /api/city/[slug]/study-cafes` →
a count and level, or a degraded marker. `Cache-Control: no-store`
(Kakao® terms forbid caching or storing results). Results are filtered by address rules from
`cities.json` `studyCafeSearch`; above Kakao®'s 45-result cap the count is scaled from
`total_count`. The client is all-or-nothing per page and falls back to the editorial
`otherWorkspaces[].fallbackLevel`; level thresholds live in `studyCafeLevels.json`.

**Attraction ordering:** the server orders per region (`regions.json` `attractionPriority`); a
per-city override (`cities.json` `attractionPriority`; `regions.json`
`elsewhereAttractionPriority` for the "Elsewhere" pill) applies client-side only while that
city's filter is active, because the server emits one array and per-city order would otherwise
leak into "All". Attractions without a photo are dropped.

**Known KTO quirks** (baked into `kto-client.mjs`/`normalize.mjs`):
- `areaBasedList2` uses undocumented `arrange=P` (view-count); `Q` (modified-date) buries
  landmarks. If the first fan-out call comes back genuinely empty (not 429 code 22), the fan-out
  switches to `arrange=R`. `{ items, quotaExceeded, liveFailed }` distinguishes quota or a failed call from a true empty.
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
- `site.json`, `regions.json` — site settings; the 6 regions; `cities.json` — workation cities
  (KTO codes, workspaces, study-café search rules, getting around), joined to regions via
  `regionSlug`. A city gets a card only if it has `cardOrder` (which also sets card order);
  records without it are kept but render no card.
- `visaRules.json` — visa thresholds; `populationDeclineAreas.json` — the Gyeonggi-do region's
  decline counties (§7); `populationDeclineDesignation.json` — MOIS designation cycle and dates.
  The nationwide MOIS list is reference only, kept outside the build in
  `notes/populationDeclineAreasFull.json`.
- `populationSource.json` — KOSIS source for city populations; `sources.json` — source lines
  for live APIs.
- `rentalMarketScan.js`, `settlingIn.json`, `food.json` — rent research, settling-in guide, dishes.
- `studyCafeLevels.json` — level thresholds for Kakao® counts; `*HeroPhotos.json` —
  cover photos with captions and credits; `topAttractions.json` / `eventsSnapshot.json` —
  fallbacks (§5).

**Computed shapes** (built in the Functions and `eligibility.js`; no data file):
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
- `Region`/`City` carry both `nameEn` and `nameKo`; attractions and events carry
  `titleEn`/`titleKo`.
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

1. **Local UI state** — burger open/closed, section-nav strip. Lives in the DOM (classes and
   attributes set by the module that owns it), not in a JS variable or store.
2. **Shared state — exactly one piece:** `EligibilityResult`. `calculator.js` reads inputs →
   calls pure `eligibility.js` → renders its own result caption; `main.js` passes
   `koreaMap.applyResult` into `initCalculator` as a callback for the map. One-directional, no
   event bus.
3. **Persistence** — none. Inputs and result live in the page only (`autocomplete="off"`, nothing
   in the URL or storage), so reload starts empty. Region pages don't read a calculator run.
