# Work&Stay Korea — Scaffolding TODO

Status: draft, awaiting approval. Do not execute until each phase is checked off with sign-off.
Rule for execution: complete one phase, pause, wait for explicit approval, mark it `[x]` before
starting the next.

**Scope of this TODO:** get a fully browsable local site built from mock data — every page,
partial, CSS file, and JS module scaffolded and wired — small enough per step to avoid blowing
output limits. This is *scaffolding*, not feature-complete implementation: business logic (real
eligibility math, live KTO calls, full responsive/a11y polish, deployment) is deliberately kept
to stub/placeholder level here and gets its own follow-up TODO once scaffolding is approved and
built. See "Explicitly deferred past scaffolding" at the bottom for what that means concretely.

Source docs: `CLAUDE.md` (rules), `architecture.md` (detail, §-references below).

## Session continuity notes
Carry these into the next session — they're decisions/caveats from chat that aren't fully
captured anywhere else in committed files. Delete each line once it's been resolved or folded
into a more permanent home (architecture.md, a code comment, etc.).

- Local dev environment now has **nvm installed** (`~/.nvm`) with **Node 24.19.0 set as the
  default** (`nvm alias default`). This was a one-time machine setup step (Node wasn't present
  before), not something the repo needs to redo — a fresh shell should already have `node`/`npm`
  on `PATH` via `.bashrc`. If a new session finds `node: command not found`, source
  `~/.nvm/nvm.sh` rather than reinstalling.
- A real `.env` with a working `KTO_API_KEY` already exists locally (not created by an assistant
  session, correctly gitignored) — don't assume it needs sourcing/asking-for again in Phase 8.
- Data-authoring convention in use across `src/_data/*.json`: unverified/mock values are marked
  inline with the literal strings `MOCK` or `PLACEHOLDER` in a `source`/`credit`/`note`/`url`
  field (e.g. `costOfLiving.json`, `food.json`, `communities.json`, city `workationCenters`).
  Search for these strings before Phase 9 to find everything that still needs real sourcing —
  there's no separate tracking list.
- `regions.json`'s `ktoLDongRegnCds`/`ktoAreaCodes` were filled in from general knowledge of
  Korea's standard administrative region codes (stable government codes, not KTO-specific), not
  verified against a live KTO API response. Sanity-check these against real API output during
  Phase 7/8 (live KTO integration) before trusting them for actual `lDongRegnCd` filtering.
- `populationDeclineAreas.json` is still an empty-array stub (§7/§11 open gap). `cities.json`
  deliberately keeps every `isPopulationDeclineArea` at `false`, including Ganghwa (Incheon) even
  though it's a plausible real candidate — resist the temptation to flip it to `true` from memory;
  wait for the official MOIS 인구감소지역 list to be sourced, since this flag is designed to
  eventually feed real eligibility-gating logic (Phase 5) and misrepresenting it undermines the
  site's core value prop (see CLAUDE.md feedback log).
- **Session recap (stopped after Phase 3, 2026-08-17):** Phases 0–3 are done. Site currently
  builds one real page (`index.njk`, still placeholder body text) through the full layout chain:
  `layouts/base.njk` → `layouts/page.njk`, with `partials/header.njk`/`footer.njk` rendering real
  nav from `site.json`. `assets/css/tokens.css` + `base.css` + `components/{header,footer}.css`
  exist. All 8 JS modules from architecture.md §4 exist and are wired through `main.js`; only
  `nav.js` has real logic (burger toggle, gated behind `.js-nav-ready` on `<body>` so JS-disabled
  nav still works at every width — toggle only shows/does anything below ~768px). **Next up:
  Phase 4 — Korea map placeholder SVG** (6 region `<g>` groups + Seoul/Incheon sub-shapes,
  `partials/korea-map.njk`, `components/korea-map.css`).
- **No browser-automation tool was available/connected this session** (`chromium-cli` not
  installed, `claude-in-chrome` not connected via `ToolSearch`) — Phase 2/3 responsive and
  console-error verification was done by CSS/JS logic review + `curl` HTTP-200 checks + `node
  --check` + watching the `eleventy --serve` rebuild log for errors, **not** actual screenshots or
  a live console. This is a real gap, not just a formality: flag it again before Phase 5 (the
  width-breakpoint infographic/single-card switch) and Phase 9 (full responsive pass) — those need
  an actual visual check per CLAUDE.md rule 7, either via a connected browser tool next session or
  the user checking manually. Don't claim a visual pass without one.
- **Session recap (Phase 4 visually verified, 2026-08-18):** Phase 4 (Korea map placeholder SVG)
  is built, structurally verified (clean `npx eleventy` build; script-diffed `_site/index.html`
  against `regions.json` — all 6 `href="/regions/<slug>/"` and all 6 `id="<svgGroupId>"` match
  exactly; CSS/SVG both 200 over `eleventy --serve`), **and now visually verified** via
  `claude-in-chrome` (extension connected this session after a Chrome restart/login check): all
  6 region shapes render with no overlap, labels legible, Seoul/Incheon sub-shapes visible inside
  Gyeonggi-do; `:hover` darkens fill correctly (checked on Gangwon-do); all 6 region links
  confirmed via accessibility-tree read (`read_page`) to have correct `href`s matching
  `regions.json` slugs, and clicking one (Jeju-do) navigated to `/regions/jeju-do/` — a 404 there
  is expected since region pages don't exist until Phase 6; zero console errors on load. **Not
  covered this pass:** narrow-viewport (360px) rendering and the burger-nav toggle —
  `resize_window` did not actually shrink the captured viewport in this session (stayed
  1850x966/1512px-wide screenshots regardless of requested size), so that check still needs a
  working resize tool or the user's manual check before Phase 5's width-breakpoint switch and
  Phase 9's full responsive pass.
- `korea-map.njk` is mounted into `index.njk` behind an explicit "Temporary Phase 4 verification
  mount" comment — Phase 5 replaces `index.njk`'s body with the real infographic/single-card
  shell (§3) and should keep the same `{% include "partials/korea-map.njk" %}` inside it rather
  than re-inlining the shortcode call.
- New Eleventy shortcode `inlineSvg` added in `eleventy.config.js` (plain `node:fs`, no new
  dependency) — reads a file from `src/assets/svg/` and inlines its raw markup so CSS/JS can
  target `<g>`/`<a>` elements directly. Reuse this shortcode for any future inlined SVG (e.g. the
  Phase 5 hand-positioned leader lines, if those end up as a separate SVG asset rather than
  inline markup in `region-card.njk`).

---

## Phase 0 — Project skeleton & tooling ✅
Goal: `npx eleventy` runs clean, folder structure from architecture.md §4 exists.

- [x] `.nvmrc`, `package.json` (`@11ty/eleventy` v3, only direct dependency), `package-lock.json`
- [x] `.gitignore` (`_site/`, `node_modules/`, `.env`), `.env.example` (documents `KTO_API_KEY`)
- [x] `eleventy.config.js` — input/output dirs, passthrough copy for `assets/`
- [x] Full empty folder tree: `src/_data`, `src/_includes/layouts`, `src/_includes/partials`,
      `src/assets/{css,js,img,fonts,svg}`, `functions/api/lib`
- [x] Confirm `npx eleventy` builds `_site/` with zero errors (no pages yet)

## Phase 1a — Mock data: core content ✅
Goal: the editorial `_data/*.json` files exist with real-or-plausible values.

- [x] `site.json` (name, nav items, footer disclaimer)
- [x] `regions.json` (6 regions, full `Region` model per §6 — mock `nomadScore`/copy is fine)
- [x] `visaRules.json` (real thresholds from §7, verified against `visa_rules.pdf` — not mock)
- [x] `cities.json`, `costOfLiving.json`, `food.json`, `transport.json`, `communities.json` (small mock sets, correct shape)
- [x] `populationDeclineAreas.json` stub — empty array, note that real sourcing is deferred (§7/§11)

## Phase 1b — Mock data: KTO-shaped content ✅
Goal: local mock JSON standing in for what Phase-N (post-scaffolding) live KTO calls will return,
so region-page templates have something realistic to render against now.

- [x] Mock `Attraction[]` and `Event[]` fixtures per region (matching §6 models exactly, including
      an empty-events region to exercise the empty-state per rule 5) — `jeju-do` has zero events,
      matching the real quirk noted in architecture.md §5
- [x] Mock gallery image list per region (`imageUrl`, `imageLicense`, attribution fields present)
- [x] Decided: mocks live in `src/_data/mock/{attractions,events,gallery}.json`. Eleventy exposes
      these as global data namespaced by directory — `mock.attractions`, `mock.events`,
      `mock.gallery` in templates (verified: 18/10/24 records). Phase-N's live-KTO swap in
      `functions/api/**` replaces the data *source* templates read from — the shape (`Attraction`/
      `Event` models from §6) is already what Phase-N's `normalize.mjs` output will match, so no
      template rewrite is needed then, only a fetch-vs-import change.

## Phase 2 — Base layout & header/footer ✅
Goal: one throwaway page renders with real nav, no JS required to navigate.

- [x] `layouts/base.njk`, `layouts/page.njk`
- [x] `partials/header.njk`, `partials/footer.njk` (nav from `site.json`, real `<a href>`s)
- [x] `assets/css/tokens.css` (color/spacing/type-scale/breakpoint custom properties)
- [x] `assets/css/base.css` (mobile-first resets, base typography)
- [x] Verify: `src/index.njk` (the real home page, doubling as the Phase 2 throwaway) renders
      header/footer via the layout chain; build succeeds, all CSS assets 200 over `eleventy --serve`.
      Nav burger (`.nav-toggle`) is `display:none` until Phase 3's `nav.js` adds `.js-nav-ready` to
      `<body>` — until then `.site-nav__list` is always visible (column <768px, row ≥768px), so nav
      is fully usable with JS disabled at every width. **Now visually verified at a real narrow
      width (2026-08-18):** `resize_window` never worked in this session (stuck reporting
      1850x966 regardless of requested size), but the user manually opened Chrome DevTools →
      device toolbar → Pixel 9 preset (412x924) on the specific tab `claude-in-chrome` had
      navigated to `localhost:8080` — the extension's screenshot/JS tools *do* correctly reflect
      a manually-set DevTools viewport even though the automated resize call doesn't. **This is
      the reusable workaround for Phase 5/9 responsive checks**: navigate the extension's tab to
      the page, ask the user to set the DevTools device preset on that exact tab, then screenshot/
      inspect normally.
      **Found and fixed a real bug this way:** at 412px, `.nav-toggle` sat ~111px away from the
      right edge with dead space on both sides, instead of flush-right — root cause was
      `.site-header__inner`'s `display:flex; justify-content:space-between` treating the
      `<nav class="site-nav">` wrapper as a 3rd flex item even after `.js-nav-ready` collapsed
      its inner `<ul class="site-nav__list">` to `display:none`; the now-empty `<nav>` still
      reserved flex-item + gap space, so `space-between` centered the toggle in the leftover gap
      instead of pinning it to the edge. Fixed in `assets/css/components/header.css` by adding
      `margin-left: auto` to `.js-nav-ready .nav-toggle` (1-line change, no HTML/JS touched) —
      toggle now sits flush-right with one consistent `--space-4` gap. Re-verified after the fix:
      toggle position correct, open/close click still sets `aria-expanded`/`.is-open` correctly,
      zero console errors.
      **768px breakpoint boundary also checked directly** (the actual transition point, not just
      well-above/well-below it): `window.matchMedia('(min-width:768px)').matches` is `true` at
      exactly 768px, toggle correctly hidden, nav list correctly `flex`-row, all 4 nav links
      render in one clean row with no wrapping/overlap, active-page bolding intact, zero console
      errors. **1280px explicitly not re-tested as a separate width** — `--content-max-width`
      (tokens.css) is `1200px`, so 1280px and the earlier ~1850px check render identically (the
      container caps and centers); no distinct behavior exists between them.
      **Phase 2/3 visual-check debt is now fully closed**, covering all three CLAUDE.md rule-7
      checkpoints (≈360 via 412px Pixel 9 preset, 768, 1280-equivalent) plus the fix verified at
      each. Phase 5 has not been started yet (`region-card.njk` doesn't exist, `index.njk` still
      carries the Phase 4 placeholder mount) — no visual check applicable there until it's built.

## Phase 3 — JS module scaffolding ✅
Goal: every JS module from architecture.md §4 exists with a stub `init()` and is imported by
`main.js` — establishes the module boundary before any module gets real logic.

- [x] `assets/js/main.js` (entry point, imports + calls each module's `init()`)
- [x] `assets/js/nav.js` — real burger-toggle logic (small enough to fully implement now)
- [x] `assets/js/calculator.js`, `eligibility.js`, `korea-map.js`, `tabs.js`, `gallery.js`,
      `region-card.js` — stub `init()` only, each with a one-line Phase-N-target comment, each
      exporting the single-`init()` shape §4's conventions section expects
- [x] Verify: `<script type="module" src="/assets/js/main.js">` wired into `layouts/base.njk`;
      all 8 JS files 200 over `eleventy --serve`, `node --check` clean on all of them, dev-server
      rebuild log shows zero errors through every edit. Burger nav verified by code path: `nav.js`
      adds `.js-nav-ready` to `<body>`, which is the only thing that lets `header.css` hide
      `.site-nav__list` behind the toggle below ~768px — without JS (or ≥768px, any time) the nav
      list stays visible per Phase 2. **Now visually/behaviorally verified** (2026-08-18, via
      `claude-in-chrome`): since the real viewport couldn't be narrowed (see Phase 2 note), the
      toggle's CSS-hidden state at the stuck wide viewport was overridden with a temporary
      injected `<style>` (test-only, not a file change) to force `.nav-toggle` visible and expose
      real narrow-width layout, then the actual button was clicked live twice. Confirmed: first
      click sets `aria-expanded="true"` and adds `.is-open` to `.site-nav__list` (nav row becomes
      visible); second click resets `aria-expanded="false"` and removes the class; zero console
      messages/errors on either click. This verifies `nav.js`'s real logic, though the visual
      layout itself was only seen at the stuck 1850px-wide viewport with CSS forced, not a true
      360px device rendering — same residual gap as Phase 2.

## Phase 4 — Korea map asset (placeholder-accurate) ✅
Goal: an SVG map with the correct 6-region group structure exists and inlines cleanly — visual
polish and real boundary accuracy is not the goal here, group/id/slug correctness is.

- [x] Placeholder `assets/svg/korea-regions.svg` — 6 region `<g>` groups with correct `svgGroupId`s
      from `regions.json` + Seoul/Incheon sub-shapes inside Gyeonggi (simple/rough shapes are fine;
      real boundary-data conversion via mapshaper is a noted follow-up, not blocking scaffolding)
- [x] `partials/korea-map.njk` — inlines the SVG, each region `<g>` wrapped in a real
      `<a href="/regions/<slug>/">` (rule 6), ineligible-region non-clickable behavior deferred to
      Phase-N (calculator doesn't exist yet)
- [x] `assets/css/components/korea-map.css` — base region fill/stroke, `:hover`/`:focus-visible`
      state, `viewBox` + `max-width: 100%`
- [x] Verify: build clean (`npx eleventy`), `_site/index.html` checked programmatically against
      `regions.json` — all 6 `href="/regions/<slug>/"` and all 6 `id="<svgGroupId>"` match exactly
      (script diffed live output against the data file, not eyeballed). CSS/SVG both 200 over
      `eleventy --serve`. Anchors are real `<a href>` SVG elements (no JS involved), so
      JS-disabled click works by construction, matching rule 6.
      **No visual/browser check this session either**: `claude-in-chrome` extension is installed
      but browser tools weren't enabled for this session (needs `/chrome` or a Claude Code
      restart) — same gap flagged after Phase 3. Implementation approach used inline SVG via a
      new `inlineSvg` Eleventy shortcode (`eleventyConfig.addShortcode`, plain `node:fs`, no new
      dependency) rather than `<img src>`, so hover/focus CSS and future JS state (Phase 5+) can
      target the `<g>`/`<a>` elements directly. `korea-map.njk` was temporarily mounted into
      `index.njk` (behind a comment) purely so it renders somewhere pre-Phase-5; Phase 5 replaces
      `index.njk`'s body entirely and will keep the same include. **Flag again before Phase 5**
      (infographic/single-card switch) and Phase 9 — those need an actual visual pass per rule 7,
      either via `/chrome` next session or the user checking `localhost:8080` manually.

## Phase 5 — Home page shell
Goal: home page renders both region-info render modes (§3) as static markup from mock data —
width-breakpoint CSS switch works, hover/tap highlight logic is deferred, not the DOM/CSS structure.

- [ ] `partials/region-card.njk` — single template used by both modes, fed from `regions.json`
- [ ] `index.njk` — loops `region-card` 6× into infographic slots (wide) + map + single dynamic-card
      container (narrow), per §3
- [ ] `assets/css/components/region-card.css` — width-only breakpoint switch, hand-positioned
      leader-line SVG (fixed coordinates, authored once)
- [ ] Verify at 360/768/1280px: correct mode shows at each width, cards contain real region content,
      JS-disabled navigation to region pages works

## Phase 6 — Region pages
Goal: all 6 region pages generate via pagination, tabs and empty states render from mock data.

- [ ] `regions/region.njk` — pagination over `regions.json` → `/regions/<slug>/`
- [ ] `partials/tabs.njk` — real anchor-based tabs (functional without JS)
- [ ] `partials/empty-state.njk` — generic reusable empty-state partial
- [ ] `partials/gallery.njk`, `partials/event-calendar.njk` — render from Phase-1b mock
      `Attraction`/`Event`/gallery data, including the deliberately-empty region
- [ ] Data-provenance note element present on each KTO-derived block (rule 5) even though the data
      is mock — so Phase-N's live swap only changes the data source, not the markup
- [ ] `assets/css/components/tabs.css`, `gallery.css`, `event-calendar.css`
- [ ] Verify: all 6 region pages build; cities+events grid is 2-col ≥900px, stacked below (§9,
      layout only — no JS-driven behavior required yet)

## Phase 7 — Remaining static pages
- [ ] `visa-info.njk` — thresholds table + family multiplier + insurance/age/stay-length/conversion
      facts, pulling numbers from `visaRules.json`
- [ ] `communities.njk` — from `communities.json`
- [ ] Confirm nav (`site.json`) links to every page that now exists, no dead links

## Phase 8 — API stub layer (local mock endpoints, not live yet)
Goal: `functions/api/**` file structure exists and returns the same shape live KTO calls will
later return, sourced from the Phase-1b mock JSON — this makes the eventual live-call swap
(a separate, compliance-driven follow-up TODO) a drop-in replacement, without doing any real
KTO integration now.

- [ ] `functions/api/lib/region-map.mjs` — `lDongRegnCd` ↔ slug mapping (real logic, small/self-contained)
- [ ] `functions/api/lib/kto-client.mjs`, `normalize.mjs` — stub/pass-through only (real KTO request
      building, paging, retry, and normalization logic is explicitly out of scope for scaffolding)
- [ ] `functions/api/region/[slug]/{attractions,events,gallery}.js` — return mock JSON matching
      the response shape the templates expect, keyed by `slug`
- [ ] Verify: hitting each function locally (`wrangler pages dev` or equivalent) returns valid
      mock JSON for every region slug

## Phase 9 — Full local build verification
- [ ] Full `npx eleventy` build, browse every page locally end to end
- [ ] Click every nav link, every region link, every tab, with JS disabled — confirm no dead ends
- [ ] Confirm every KTO-derived block shows its provenance note + at least one empty-state region
- [ ] List any gaps found during this pass before calling scaffolding done

---

## Explicitly deferred past scaffolding (separate future TODO)
Not part of this document's execution — noted so nothing is lost:
- Real `eligibility.js` logic + `calculator.js`/`korea-map.js` state wiring, hover/focus highlight,
  `sessionStorage` persistence, ineligible-region click gating (§5/§8 from architecture.md)
- Real KTO OpenAPI integration in `kto-client.mjs`/`normalize.mjs` (live calls, edge caching, rate
  limits, the quirks list in §5) — compliance-critical, but a distinct build phase from scaffolding
- Real Korea boundary-data SVG conversion (mapshaper pass) replacing the Phase 4 placeholder
- Population-decline county list sourcing (§7/§11 open gap) and the `'partial'` map tier
- Full responsive/a11y pass (landscape-phone tuning, iOS Safari pass, 44px hit-target audit)
- Deployment to Cloudflare Pages, env vars, analytics, live-URL + KTO call-history verification
- Workation-centre city list expansion, nature activities/Go Camping API (last-cut candidate)
