# Work&Stay Korea

English-language web service helping Digital Nomad Visa (F-1-D) holders find and settle in a
non-capital Korean region. Solo-developer MVP for the 2026 관광데이터 활용 공모전
(②-2 웹·앱 구현 부문), Designated Task #4 (sustainable long-term residency vs. one-off tourism
in population-declining regions). See `architecture.md` for full technical detail — this file is
the durable, brief set of project-scope agreements.

## Contest constraints (do not violate)

- **KTO OpenAPI use is mandatory** and judged (20/100 pts). Judges verify actual call-history
  logs on the submitted key during the dev period (2026-07-27 to 09-21). **Do not build a
  pure build-time-fetch / committed-JSON-only pipeline for KTO-sourced content** — it reads as
  "local DB storage," which the contest FAQ explicitly discourages and flags as inspectable.
  KTO-sourced content (attractions, festivals, hero images) must go through the live proxy
  layer described in architecture.md, not git-committed snapshots.
- Submission needs a **live URL** (web track requires no store approval, just a working link).
- One designated task only: **#4**. Feature work should trace back to its hashtags
  (#workation #month-long-stay #2030s-youth #local-tourism) — the functional spec submission
  will be checked against them.
- Hard deadline: **2026-09-21 16:00 KST**. Real target: feature-complete by **~Sept 7** to leave
  2–2.5 weeks for user testing and the submission write-up.

## Workflow constraints (do not violate)

- The user runs all `git add`/`git commit` themselves — only propose the
  `git add` file list and commit message after each phase, never execute git commands that stage
  or commit.
- Dev server: `npm run serve` (port 8080, `eleventy --serve`); stop with
  `lsof -ti:8080 -sTCP:LISTEN | xargs -r kill` before relaunching to avoid `EADDRINUSE`.
- `architecture.md` is a decisions record, not a scratchpad. So keep two rules:
1. Never reference ROADMAP_TODO.md phase numbers inside architecture.md (e.g. "tracked as Phase 29", "open item, see Phase 15"). Phases are scheduling/process; architecture.md is supposed to be "independent of project scheduling" per its own header.
2. Keep entries concise. Don't narrate the reasoning trail — state the decision that stands and a one-line "why" at most.
- keep `ROADMAP_TODO.md` records concise as well. Follow-up todo's should be in a separate phase or marked as undone during current phase.


## Tech stack (do not add to this list without strong justification)

Eleventy (11ty) v3 + Nunjucks, hand-written CSS, vanilla ES module JS, inline SVG map,
Cloudflare Pages + Pages Functions. Zero client-side libraries. One direct npm dependency.
No database. See architecture.md §2 for why each choice was made — the reasoning is the
guardrail, not just the list.

## Non-negotiable rules

1. No new runtime dependency (client-side library, build tool, framework) without writing down
   why the current stack can't do it. Default answer is no.
2. All KTO OpenAPI calls happen server-side, inside Cloudflare Pages Functions
   (`functions/api/**`). Never call KTO from client-side JS, never inline the API key into
   `src/`, `_site/`, or any template.
3. `lDongRegnCd` is the canonical KTO regional key. `areacode` is empty on festival records —
   never rely on it for filtering.
4. Content and numbers (visa thresholds, cost-of-living figures, region metadata) live in
   `src/_data/*.json`, never hardcoded in templates or JS.
   - Unverified/placeholder values in `_data/*.json` are marked inline with the literal string
     `MOCK` or `PLACEHOLDER` in a `source`/`credit`/`note`/`url` field on that record — never
     silently. Grepping `_data/*.json` for these two strings is the canonical way to find
     everything that still needs real sourcing before launch; there is no separate tracking list.
5. Every KTO-derived UI block shows data provenance and has a designed empty state (some
   regions currently have zero upcoming festivals — that's expected, not a bug).
6. Progressive enhancement: every region link is a real `<a href>`, tabs are real anchors, the
   site is navigable with JS disabled. Only the calculator and live map states require JS.
7. Mobile-first CSS, test at 360 / 768 / 1280px plus a real iOS Safari pass before considering
   a feature done.
8. Pin dependencies (`package-lock.json`, `.nvmrc` committed). No automated dependency bumps.
   Upgrades are deliberate and one at a time.
9. i18n is not implemented in v1, but `Region`/`City`/`Attraction` models always carry both
   `nameEn` and `nameKo` — don't strip this "for simplicity," it's there for the planned
   post-MVP language extension and for users cross-referencing Naver Map by Korean name.

## Feedback log (approach decisions made and why)

- Rejected *dynamic, hover-triggered* floating popups for the region map info panel — bug-prone
  (edge clipping, z-index, mobile focus-trap). Adopted instead: a **static, always-visible
  infographic** (6 fixed callouts + hand-positioned leader lines, all authored once, nothing
  computed at runtime) above a width breakpoint, falling back to a single dynamic card below
  it. The breakpoint is width-only (not a device/orientation check) specifically so wide
  landscape phones get the infographic too, not just desktop. Border/leader-line/callout
  highlight on hover (wide) or tap (narrow) is v1, not deferred polish.
- Rejected pure build-time-fetch-and-commit for KTO data after reading the contest FAQ — judges
  check live call history, not just that OpenAPI was used once during a scrape. This is a
  contest-compliance decision, not a taste preference — don't revert to full static-bake for
  KTO content even if it'd simplify hosting.
- Ineligible (greyed) regions are intentionally not clickable through — showing them as
  navigable would misrepresent the visa-eligibility gating that's the site's core value prop.
- Region map uses real province boundaries (Wikimedia source, simplified), not placeholder
  shapes — user wants genuine geography. Jeju keeps its true geographic distance (sea-tinted
  background, not an inset) — deliberate, don't "fix" the gap.
