# Work&Stay Korea

Work&Stay Korea is an English-language site built to visualize Korea's Digital Nomad Visa (F-1-D)
rules — effective from June 30, 2026 — and make it easier to choose the most suitable area to live
in.

**Live site: <https://worknstay-korea.com/>**

![Homepage: eligibility calculator over the hero photo](./docs/homepage-hero.png)
![Homepage: interactive region map with the six region cards](./docs/homepage-regions.png)

Built solo for the 2026
[관광데이터 활용 공모전](https://api.visitkorea.or.kr/#/cntSearchDetail?no=3) (Tourism Data
Utilization Contest), ②-2 웹·앱 구현 부문, Designated Task #4 — sustainable long-term residency
vs. one-off tourism in population-declining regions.

## What it does

- **Eligibility calculator** — applies the actual F-1-D income rules (by age, family status and
  capital vs. non-capital area) and shows the result on an interactive map: eligible in every
  region, eligible in the regions outside the capital area plus partly eligible in Gyeonggi-do, or
  not eligible, with every region greyed out.
- **Region pages** — Korea region profiles with vibe tags, estimated rental price ranges,
  workation cities with work-friendly places (coworking spaces, study cafés), and leisure info —
  local food, attractions and events.
- **Visa info, Settling in and About pages** — the F-1-D eligibility rules, documents and FAQ; a
  general guide to renting, workspaces and communities in Korea; and a note on who made the
  site and why.

## Tech stack

The stack is kept deliberately simple and stable — designed to last and be easy to maintain solo:

- **[Eleventy (11ty) v3](https://www.11ty.dev/)** + Nunjucks templates — static site generation,
  the only build dependency
- **Hand-written CSS** — pure CSS using Grid/Flexbox and custom properties
- **Vanilla ES modules & progressive enhancement** — lightweight client JS; the site remains fully
  functional with static fallbacks if JavaScript is disabled
- **Inline SVG** for the region map — <=65KB Korea map built directly into the DOM without
  external map services
- **[Cloudflare Pages + Pages Functions](https://pages.cloudflare.com/)** — static hosting with
  serverless functions for the live KTO and Kakao® Local API calls
- **[Cloudflare D1](https://developers.cloudflare.com/d1/)** — database to store the site's anonymous,
  cookieless analytics events
- **[Wrangler](https://developers.cloudflare.com/workers/wrangler/)** — local development and
  deployment CLI, the only dev dependency

Versions are pinned (`package-lock.json`, `.nvmrc`, `engines`), with no automated dependency bumps.
See [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for the full breakdown of the stack and data models.

### API calls
The site uses
[Korean Tourism Organization (KTO) OpenAPI](https://api.visitkorea.or.kr/?loginFlag=sso#/useLanguageGuide)
and [Kakao® Maps API](https://developers.kakao.com/docs/en/kakaomap/common) to fetch information
for region pages.
Both use live server-side calls on every region-page visit, with nothing cached.

- **KTO OpenAPI:** the English Tourism Information service is used to fetch information on
  attractions and events for each region. Live calls are a contest requirement, which can be
  re-checked with the API policy once the contest evaluation is finished.
- **Kakao® Maps API:** used to retrieve study cafés density estimate shown as a battery in every
  workation city card. Kakao®'s terms don't allow caching or storing Local API results in any form.
  See [Kakao® DevTalk thread](https://devtalk.kakao.com/t/local-api/151745/5) on permitted use.

In both cases, the keys live only in the Cloudflare environment or local `.env`.

### Study-café battery

Each city card shows a 4-cell battery for study-café density.

- **Live:** a Pages Function searches `<city> 스터디카페` via the Kakao® Local keyword search,
  filters results whose category/name match and whose address is in that city (the search spills
  into neighbouring cities), and maps the count to a level. Kakao® caps any query at 45
  retrievable results; past that, the count is estimated by scaling Kakao®'s `total_count` by the
  share of retrieved results that passed the filter. Cards show "loading…" while calls are in
  flight.
- **Thresholds** (`src/_data/studyCafeLevels.json`): 0 → none (0 cells), 1–9 → a few (1),
  10–29 → good (2), 30–99 → lots (3), 100+ → plenty (4).
- **Fallback:** all-or-nothing per region page. If any city's live call fails (or no Kakao® key
  is set), every card on that page shows its fallback level plus a note that the data is a manual
  editorial estimate. Editorial levels are estimated by hand on Naver Map.

## Getting started

To run a local copy for review or development:

Requires Node 24.19.0 (see `.nvmrc`).

```bash
npm install
cp .env.example .env          # then fill in KTO_API_KEY and KAKAO_REST_API_KEY
npm run pages:dev             # http://localhost:8788
```

`pages:dev` runs the full stack — Eleventy build + Cloudflare Pages Functions — so the live
endpoints work locally. It doesn't watch files; rerun `npm run build` after an edit. Plain
`npm run serve` only serves static Eleventy output: the `/api/**` routes won't exist and the
attraction, festival and study café battery sections render their empty state.

Both `wrangler pages dev` and the scripts under `scripts/` read keys from the single gitignored
`.env`.

**No keys yet, just want to work on the UI?** Both API keys are optional locally.
- Without `KTO_API_KEY`, the attractions and festivals Functions skip the live call and serve the
  committed fallback files — real cards to test filters against.
- Without `KAKAO_REST_API_KEY`, study-café cards show their editorial fallback levels.

**Testing against real data without burning quota on every reload?** Keep the KTO key set and add
`KTO_DEV_CACHE=1` to `.env`. Repeat requests are served from an in-memory cache instead of
re-hitting KTO. Unset `KAKAO_REST_API_KEY` to see fallback data.

`KTO_DEV_FORCE_QUOTA=1` makes every KTO call report quota-exceeded, to test the degraded UI.

Both KTO flags are dev-only — never set them in production.

**Analytics events** Run `npm run db:migrate:local` once to create local D1 database tables;
without it events are silently dropped without affecting site functionality.

**Scripts:** `scripts/verify-*.mjs` are plain Node checks (no test framework), run with
`node --env-file=.env scripts/<name>.mjs`; the ones that call KTO need the key and spend quota.

## Deploying

Hosted on Cloudflare Pages: build command `npm run build`, output directory `_site`. Set
`KTO_API_KEY` and `KAKAO_REST_API_KEY` as Pages environment variables — they are per environment,
so Production and Preview each need their own. To store analytics events bound a D1 database as
`DB` per environment in `wrangler.jsonc`, with `migrations/` applied; without the binding events
are discarded.
Per this project's Pages settings, every push to main deploys automatically; other branches get
preview deployments.

## Project layout

```
docs/                   Project docs (architecture, design, roadmap), screenshots, contest spec
eleventy/               Eleventy template filters
functions/api/          Cloudflare Pages Functions — live KTO and Kakao® proxies, analytics intake
migrations/             D1 schema for analytics events
notes/                  Research notes and raw reference data (not part of the build)
scripts/                Standalone verification and investigation scripts (no test framework)
src/_data/              Editorial content: visa rules, region/city metadata, rental data, fallbacks
src/_includes/          Nunjucks layouts and partials
src/assets/             CSS, JS, SVG, images
src/regions/            Per-region pages (paginated from _data/regions.json)
```

## Project docs

- [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — stack, folder structure, data models, and KTO
  integration conventions, with the reasoning behind notable decisions
- [`TRACKING_PLAN.md`](./docs/TRACKING_PLAN.md) — analytics events, params, privacy rules and
  pipeline
- [`PRIVACY.md`](./PRIVACY.md) — privacy notice for users
- [`DESIGN.md`](./docs/DESIGN.md) — visual/design conventions (palette, type, spacing, components)
- [`ROADMAP_TODO.md`](./docs/ROADMAP_TODO.md) — phase-by-phase feature checklist
- [`CLAUDE.md`](./CLAUDE.md) — the operating rulebook for Claude Code in this repo (contest
  constraints, workflow rules, tech-stack conventions)
- [`notes/attraction-gallery-report.md`](./notes/attraction-gallery-report.md) — investigation of
  the optimal KTO calls per region
- [`src/assets/img/brand/README.md`](./src/assets/img/brand/README.md) — brand icon files and
  usage
- [`docs/contest-functional-spec.pdf`](./docs/contest-functional-spec.pdf) — the functional
  specification submitted to the contest, in Korean
- [`.claude/agents/website-architect.md`](./.claude/agents/website-architect.md) — the Claude Code
  subagent used for planning the site's architecture

## License / credits

Source is public for review; all rights reserved. Contributions and forks are welcome by
arrangement — open an issue and we'll sort out the license you need.

Project built with [Claude Code](https://claude.com/claude-code) as a development assistant.

Data and assets are drawn from several sources, each credited in place on the site:
- **Korea Tourism Organization** (© 한국관광공사) — attractions, festivals, and most hero/dish
  photos saved static via its OpenAPIs, per its terms.
- **Kakao®** — study-café levels, via the Kakao® Local API.
- **KOSIS** (Korean Statistical Information Service) — city population figures.
- **Wikimedia Commons** — the base province-boundary map, and a handful of dish photos.
