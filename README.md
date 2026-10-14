# Work&Stay Korea

Korea's Digital Nomad Visa (F-1-D) has an income threshold that depends on the applicant's age
and the region a person would like to settle in. Work&Stay Korea is an English-language
site built to visualize those rules and make it easier to choose the most suirable area to live.

The site takes income, age, and family-accompaniment status as input and highlights which of
Korea's six regions the applicant is eligible for. Each region page then surfaces workation-
friendly co-working spaces, curated local food, and — pulled live from the Korea Tourism
Organization's public API — nearby attractions and festivals.

**Live site: <https://worknstay-korea.com/>**

Built solo for the 2026 [관광데이터 활용 공모전](https://api.visitkorea.or.kr/#/cntSearchDetail?no=3)
(Tourism Data Utilization Contest), ②-2 웹·앱 구현 부문, Designated Task #4 — sustainable
long-term residency vs. one-off tourism in population-declining regions.

## What it does

- **Eligibility calculator** — walks through the actual F-1-D income rules (which differ by age,
  region, and family status, including Korea's official population-decline county list) and
  greys out regions user doesn't qualify for on an interactive map.
- **Region pages** — workation cities with rental prices, co-working spaces, study cafés, and local 
  getting-around info for each of Korea's six regions.
- **Live attractions & festivals** — fetched from the KTO English Tourism Information OpenAPI on
  every page view (not a cached snapshot — see [Why the API calls are live](#why-the-api-calls-are-live)).
- **Local food guide** — hand-picked regional dishes with photo credits and sourcing.
- **Visa info & Settling in pages** — the F-1-D visa's eligibility rules, documents, and FAQ, plus
  a general guide to renting, workspaces, and communities in Korea.
- Works with JavaScript off: every region, tab, and link is a real anchor. Only the calculator
  and live map highlighting need JS.

## Tech stack

Kept deliberately simple and stable — no build chain or dependency churn to babysit while
maintaining this solo:

- **[Eleventy (11ty) v3](https://www.11ty.dev/)** + Nunjucks templates — static site generation,
  one npm dependency
- **Hand-written CSS** — custom properties, Grid/Flexbox, no Tailwind or build step
- **Vanilla ES modules** — no client-side framework
- **Inline SVG** for the region map — no Leaflet/Mapbox, no second API key
- **[Cloudflare Pages + Pages Functions](https://pages.cloudflare.com/)** — static hosting, plus
  a thin serverless proxy for the one thing that needs a backend: live KTO API calls

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full breakdown of this stack, data models, and
known quirks of the KTO API.

## Why the API calls are live

Contest rules require *checkable* use of the KTO OpenAPI — judges inspect the actual call-history
log on the submitted key. A build-time scrape baked into committed JSON wouldn't satisfy that, so
attractions and festivals are fetched live, server-side, on every region-page visit, through a
Cloudflare Pages Function that holds the API key. The key never reaches the client or the
repository.

Hero photos and dish photos are the one deliberate exception — they're hand-picked once (via the KTO API)
and committed as static files, since which photo represents a region or dish is an editorial choice, not 
something a live query should pick at random on each visit.

## Study-café battery

The study-café levels shown on the website are based on real-time Kakao® Map REST API
(Search place by keyword) results. Sources: [Kakao® Maps API docs](https://developers.kakao.com/docs/en/kakaomap/common)
and the [Kakao® DevTalk thread](https://devtalk.kakao.com/t/local-api/151745/5) on permitted use.

- **Live:** on each region-page view, a Pages Function searches `<city> 스터디카페` via the Kakao®
  Local API, keeps results whose category/name match and whose address is in that city (Kakao®'s
  search spills into neighbouring cities), and maps the count to a 4-cell battery. Kakao® caps
  any query at 45 retrievable results; past that, the count is estimated by scaling Kakao®'s
  `total_count` by the share of retrieved results that passed the filter. While the calls are in
  flight, cards show an empty battery with "loading…". Transient errors (network, 5xx) are
  retried once; quota (429) and other 4xx errors are not.
- **Thresholds** (`src/_data/studyCafeLevels.json`): 0 → none (0 cells), 1–9 → a few (1),
  10–29 → good (2), 30–99 → lots (3), 100+ → plenty (4).
- **No caching or storage** of Kakao® results, per its terms — responses are `no-store`.
- **Fallback:** each city carries an editorial `fallbackLevel` in `src/_data/cities.json`. These
  were first estimated by hand on Naver Map, zooming in and out around each city to gauge
  study-café density. That pass also set the initial thresholds and served to sanity-check the
  live Kakao® levels. All-or-nothing per region page: if any city's live call still
  fails, every card on that page shows its fallback level plus a note saying the data is a
  manual editorial estimate.

## Getting started

```bash
npm install
cp .env.example .env          # add your API keys: KTO, Kakao® (optional, see below)
npm run pages:dev             # http://localhost:8788
```

`pages:dev` runs the full stack — Eleventy build + Cloudflare Pages Functions — so the live KTO
endpoints actually work locally. Plain `npm run serve` only serves static Eleventy output; the
`/api/**` routes won't exist and attraction/festival sections will render their empty state.

Both Pages Functions (`wrangler pages dev`) and the standalone scripts under `scripts/` read
the key from the single gitignored `.env`.

**Don't have a KTO API key yet, just want to work on the UI?** Leave `KTO_API_KEY` unset in
`.env`. The Functions then skip the live call and serve the committed fallback data
instead — real cards to test filters against, zero API calls spent.

**Testing against real data without burning quota on every reload?** Keep the key set and add
`KTO_DEV_CACHE=1` to `.env`. Repeat requests are served from an in-memory cache instead of
re-hitting KTO. Dev-only — never set this in production.

## Project layout

```
functions/api/          Cloudflare Pages Functions — live KTO proxy (server-side only)
src/_data/               Editorial content: visa rules, region/city metadata, rental data
src/_includes/           Nunjucks layouts and partials
src/assets/              CSS, JS, SVG, images
src/regions/             Per-region pages (paginated from _data/regions.json)
scripts/                 Standalone verification scripts (no test framework)
```

## Contributing / project docs

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — stack, folder structure, data models, and KTO
  integration conventions, with the reasoning behind the notable decisions
- [`DESIGN.md`](./DESIGN.md) — visual/design conventions
- [`CLAUDE.md`](./CLAUDE.md) — the operating rulebook for Claude Code in this repo (contest
  constraints, workflow rules, tech-stack conventions)

## License / contest note

Solo submission for the 2026 관광데이터 활용 공모전, built with [Claude Code](https://claude.com/claude-code)
as a development assistant.

Data and assets are drawn from several sources, each credited in place on the site:
- **Korea Tourism Organization** (© 한국관광공사) — attractions, festivals, and most hero/dish
  photos, via its OpenAPI, per its terms.
- **KOSIS** (Korean Statistical Information Service) — city population figures.
- **Wikimedia Commons** — the base province-boundary map, and a handful of dish photos.
