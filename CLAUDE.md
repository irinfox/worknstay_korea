# Work&Stay Korea

English-language web service helping Digital Nomad Visa (F-1-D) applicants find and settle in a
non-capital Korean region. Solo-developer MVP for the 2026 관광데이터 활용 공모전
(②-2 웹·앱 구현 부문), Designated Task #4 (sustainable long-term residency vs. one-off tourism
in population-declining regions). See `ARCHITECTURE.md` for full technical detail — this file is
the durable, brief set of project-scope agreements.

## Contest constraints (do not violate)

- **KTO OpenAPI use is mandatory** and judged (20/100 pts). Judges verify actual call-history
  logs on the submitted key during the dev period (2026-07-27 to 09-21). **Do not build a pure
  build-time-fetch / committed-JSON-only pipeline for KTO-sourced content** — it reads as "local
  DB storage," which the contest FAQ explicitly discourages and flags as inspectable.
  Content the live endpoints serve (attractions, festivals) must go through the live proxy
  layer described in ARCHITECTURE.md, never a git-committed snapshot. Everything else may be
  committed, KTO-sourced or not (fallback files, editorial data, hand-picked photos) — see
  ARCHITECTURE.md §5 "Static exceptions".
- Submission needs a **live URL** (web track requires no store approval, just a working link).

## Workflow constraints (do not violate)

- The user runs all `git add`/`git commit` themselves — only propose the
  `git add` file list and commit message after each phase, never execute git commands that stage
  or commit.
- Dev server: `npm run pages:dev` (port 8788; runs Pages Functions, reads API keys from
  `.env`). Kill the port first: `lsof -ti:8788 -sTCP:LISTEN | xargs -r kill`.
- Two ways to avoid burning KTO quota — both still need `pages:dev` running (plain `npm run
  serve` skips Pages Functions entirely, so `/api/region/.../attractions` 404s and the page
  renders its "no attractions" empty state instead — no cards to test against):
  1. Testing the UI/filters, don't care about real data: unset `KTO_API_KEY` in `.env`. The
     attractions/events Functions then skip the live KTO call and serve their real fallback files
     (`topAttractions.json`/`eventsSnapshot.json`) instead — zero live calls, real cards to filter,
     same rendering code path as production.
  2. Testing against real live data, want to reload without re-paying for the same request: keep
     the key set, and also add `KTO_DEV_CACHE=1` to `.env`. Repeat identical calls are then
     served from an in-memory cache instead of hitting KTO again. Dev-only — never set this in
     Cloudflare's production environment.
- `ARCHITECTURE.md` is a decisions record, not a scratchpad. So keep three rules:
1. Never reference ROADMAP_TODO.md phase numbers inside ARCHITECTURE.md (e.g. "tracked as
   Phase 29", "open item, see Phase 15"). Phases are scheduling/process; ARCHITECTURE.md is
   independent of project scheduling.
2. Keep entries concise. Don't narrate the reasoning trail — state the decision that stands and
   a one-line "why" at most.
3. Code comments don't cite ARCHITECTURE.md section numbers or CLAUDE.md rule numbers — they
   drift when renumbered. State the decision in the comment; at most name the doc.
- keep `ROADMAP_TODO.md` records concise as well. Follow-up todo's should be in a separate phase
  or marked as undone during current phase.

## Design conventions
Follow DESIGN.md for all visual decisions (palette, type, spacing, component rules).

## Tech stack (do not add to this list without strong justification)

Eleventy (11ty) v3 + Nunjucks, hand-written CSS, vanilla ES module JS, inline SVG map,
Cloudflare Pages + Pages Functions. Zero client-side libraries. One runtime dependency
(`@11ty/eleventy`); dev tooling (wrangler) lives in `devDependencies`. No database.
Third-party embeds (fonts, analytics) are listed in ARCHITECTURE.md §2, which also gives the
reasoning for each choice — the reasoning is the guardrail, not just the list.

## Non-negotiable rules

1. No new runtime dependency (client-side library, build tool, framework) without writing down
   why the current stack can't do it. Default answer is no.
2. All KTO OpenAPI calls made by the site happen server-side, inside Cloudflare Pages Functions
   (`functions/api/**`). Never call KTO from client-side JS.
   Secrets: keys must never reach shipped output (built HTML/JS or client code) — never inline
   them into `src/`, `_site/`, or any template. Pages Functions read them from the runtime env.
   Local scripts in `scripts/` may read `.env`; they are dev-only verification tools, never
   imported by the build or by Functions, and should use single targeted queries to save API
   quota.
3. `lDongRegnCd` is the canonical KTO regional key. `areacode` is empty on festival records —
   never rely on it for filtering.
4. Content and numbers (visa thresholds, rent figures, region metadata) live in
   `src/_data/`, never hardcoded in templates or JS.
   - The `MOCK`/`PLACEHOLDER` marker convention was scaffolding-only and is no longer used; no
     such markers remain in `_data`. Don't ship unverified values — if one is unavoidable, mark
     it on its record (`source`/`note`) and say so.
5. Every KTO-derived UI block shows data provenance and has a designed empty state (some
   regions currently have zero upcoming festivals — that's expected, not a bug).
6. Progressive enhancement: links and static content work without JS (every region link is a
   real `<a href>`). The calculator, the live map states and the API-fed blocks (attractions,
   events, study-café counts) need JS.
7. Mobile-first CSS, test at 360 / 768 / 1280px plus a real iOS Safari pass before considering
   a feature done.
8. Pin dependencies (`package-lock.json`, `.nvmrc` committed). No automated dependency bumps.
   Upgrades are deliberate and one at a time.
9. Keep both English and Korean names on regions, cities, attractions and events
   (`nameEn`/`nameKo`, `titleEn`/`titleKo`) — don't strip the Korean "for simplicity". Users
   search by Korean name (e.g. in Naver Map), where romanized search is often worse.

## UX decisions

Region map and info panel, carousel, eligibility gating: decisions and reasons live in
`ARCHITECTURE.md` §3 (map conventions included). Read them before changing any of those.
