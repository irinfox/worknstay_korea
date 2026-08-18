# Work&Stay Korea — Scaffolding TODO

Status: **Phases 0–10 complete ✅ — this document's own scope is fully done.** Every page/
partial/CSS file/JS module exists and is wired to mock data; the full site is browsable end to
end; region-page tabs are real single-panel tabs; region-page content is centered. Real feature
work (real calculator, real map, live KTO integration, etc.) lives in `ROADMAP_TODO.md`, not
here.

Rule for execution: complete one phase, pause, wait for explicit approval, mark it `[x]` before
starting the next.

**Scope of this TODO:** get a fully browsable local site built from mock data — every page,
partial, CSS file, and JS module scaffolded and wired — small enough per step to avoid blowing
output limits. This is *scaffolding*, not feature-complete implementation: business logic (real
eligibility math, live KTO calls, full responsive/a11y polish, deployment) is deliberately kept
to stub/placeholder level here. See `ROADMAP_TODO.md` for what comes after.

Source docs: `CLAUDE.md` (rules), `architecture.md` (detail, §-references below).

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
Goal: local mock JSON standing in for what `ROADMAP_TODO.md` Phases 20–23's live KTO calls will
return, so region-page templates have something realistic to render against now.

- [x] Mock `Attraction[]` and `Event[]` fixtures per region (matching §6 models exactly, including
      an empty-events region to exercise the empty-state per rule 5) — `jeju-do` has zero events,
      matching the real quirk noted in architecture.md §5
- [x] Mock gallery image list per region (`imageUrl`, `imageLicense`, attribution fields present)
- [x] Decided: mocks live in `src/_data/mock/{attractions,events,gallery}.json`. Eleventy exposes
      these as global data namespaced by directory — `mock.attractions`, `mock.events`,
      `mock.gallery` in templates (verified: 18/10/24 records). `ROADMAP_TODO.md` Phase 22's
      live-KTO swap in `functions/api/**` replaces the data *source* templates read from — the
      shape (`Attraction`/`Event` models from §6) is already what Phase 21's `normalize.mjs`
      output will match, so no template rewrite is needed then, only a fetch-vs-import change
      (and Phase 23 for actually wiring region pages to fetch it).

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
      each.

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
      `ROADMAP_TODO.md` Phase 17 (calculator doesn't exist yet)
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
      `index.njk`'s body entirely and will keep the same include. (Closed — see Phase 5 and
      Phase 9's own verify notes below for the real visual passes that resolved this.)

## Phase 5 — Home page shell ✅
Goal: home page renders both region-info render modes (§3) as static markup from mock data —
width-breakpoint CSS switch works, hover/tap highlight logic is deferred, not the DOM/CSS structure.

- [x] `partials/region-card.njk` — single template used by both modes (`region-card--infographic`
      compact / `region-card--single` full-size), fed from `regions.json` + `costOfLiving.json`
      via a new `findBySlug` Nunjucks filter (`eleventy.config.js`) and a new `krw` thousands-
      separator filter for cost figures
- [x] `index.njk` — left column (Chungcheong-do, Jeolla-do, Jeju-do) + shared `korea-map.njk`
      include (kept visible at every width — it's a plain grid child, not nested inside a
      wide-only wrapper) + right column (Gangwon-do, Gyeonggi-do, Gyeongsang-do), all as direct
      children of `.region-infographic` so the columns can be hidden below the breakpoint without
      hiding the map too; `.region-single` (defaults to Gyeonggi-do) renders after it for narrow
      mode. Column L/R assignment and top-to-bottom order follow each region's actual
      `centroid.y` in `regions.json`, matching the map's placeholder shape positions.
- [x] `assets/css/components/region-card.css` — width-only 768px breakpoint (hardcoded, matching
      the existing header.css constraint — custom properties aren't readable in `@media`); fixed
      720px-wide infographic grid (210px col / 260px map / 210px col) so the SVG leader-line
      overlay's coordinates never need recomputing; 6 `<line>` elements with fixed coordinates
      computed from each region's `centroid` mapped into the container's local coordinate space.
      `.page` given base padding in `base.css` (was 0 — first phase with real content).
- [x] Verify: clean `npx eleventy` build; all 7 region-card `<a href>`s (6 infographic + 1
      single) checked via JS and match `regions.json` slugs exactly; zero console errors.
      **Visually verified across all three rule-7 checkpoints** (`claude-in-chrome`, same
      DevTools-preset-on-extension-tab workflow established after the Phase 2/3 catch-up):
      - **Wide** (~1850px, the environment's stuck default): all 6 cards render with real data
        (name, nomad score, hashtags, cost, "Learn more →"); leader lines initially invisible
        (traced programmatically first — all 6 `<line>` elements present with correct computed
        endpoints — turned out to be a contrast bug, not a positioning bug: `stroke:
        var(--color-border)` (#ddd9d1) against white was nearly invisible; fixed to
        `var(--color-text-muted)` at `stroke-opacity: 0.6`, re-verified visible on both sides).
      - **768px exactly** (the tightest fit: 720px fixed content against 736px available):
        `document.documentElement.scrollWidth === clientWidth === 768`, no horizontal overflow;
        cost labels wrap to a second line inside the 130px-tall cards but stay within bounds,
        nothing clipped.
      - **412px** (Pixel 9 preset, ≈360px checkpoint): map full-width, single Gyeonggi-do card
        below it with untruncated intro text, correct data, working link; zero console errors.
      - Narrow-mode DOM/CSS switch (columns + lines hidden, single card shown) also verified
        programmatically before the visual pass. One tooling note: simulating narrow mode via a
        forced CSS override at the actual stuck-wide (1850px) viewport blew the map up to
        ~1800×2790px and made `computer:screenshot` time out repeatedly (JS inspection still
        worked); not a real bug, just confirms the override technique doesn't substitute for an
        actual narrow viewport when a component's size is width-driven (unlike the Phase 3 nav
        toggle, which was a fixed-size element).

## Phase 6 — Region pages ✅
Goal: all 6 region pages generate via pagination, tabs and empty states render from mock data.

- [x] `regions/region.njk` — pagination over `regions.json` → `/regions/<slug>/`; header
      (name/Ko-name/hashtags/longIntro) + 3 tabs (Overview, Attractions, Living Info — see note
      below on why not 4). **→ superseded by Phase 10: now 2 tabs** (Overview absorbed
      Attractions + Local food; Living Info kept to cost + transport only).
- [x] `partials/tabs.njk` — real anchor-based tabs (functional without JS; sticky nav, no bullets)
- [x] `partials/empty-state.njk` — generic reusable empty-state partial (dashed box)
- [x] `partials/event-calendar.njk` — **not** the simple upcoming-list originally planned. Mid-build
      feedback: user wanted a real month-grid calendar, not a text hint for the empty case. Rebuilt
      as `eleventy/event-calendar.mjs`, a JS shortcode (real date math doesn't belong in Nunjucks) —
      renders one grid per distinct calendar month any event touches (chronological, multi-month
      events like Cheongju's Sep11–Oct11 correctly split across two grids), event days highlighted,
      legend underneath with date range/title/address. Zero-event regions (Jeju-do) get one blank
      grid for the current month + the empty-state note, not just text — verified via exact day-count
      math (Gyeonggi-do: Aug 7–9 + Oct 2–5 = 7 marked cells, confirmed programmatically) and visually.
      Calendar was initially oversized (53×53px cells, 419px-tall month block) at every width tested,
      not just narrow — fixed with `max-width: 280px` on `.event-calendar__month`, re-verified
      compact at 309px, 412px, and inside the 900px 2-col desktop layout.
- [x] `partials/gallery.njk` — built (scroll-snap, license/attribution plumbing) but **not currently
      wired into region.njk**: originally planned as a separate "Gallery" tab for `mock.gallery`
      (hero images, KTO `detailImage2`), but user feedback after visual review found a dedicated
      Gallery tab confusing next to Attractions and wanted Attractions itself to be the horizontal-
      scroll gallery view. Tab count dropped from the planned 4 to 3 (Overview/Attractions/Living
      Info); `.attraction-list` restyled from a CSS grid to the same scroll-snap pattern as
      `gallery.css`. `gallery.njk`/`gallery.css`/`mock.gallery` kept in the repo, unused for now —
      reserved for hero images or a future Natural Activities section (architecture.md §6/§11
      `NatureActivity`, explicitly last-cut-if-short-on-time), not deleted. **→ superseded by
      Phase 10: `gallery.njk`/`gallery.css` deleted** (zero remaining consumers — Nature
      Activities was decided fully cut, not last-cut, in `ROADMAP_TODO.md`). `mock.gallery` data
      and the `functions/api/region/[slug]/gallery.js` endpoint were kept, unaffected.
- [x] Data-provenance note present on every KTO-derived block (rule 5) — Attractions and the event
      calendar both carry it, even though the data is mock
- [x] `assets/css/components/tabs.css`, `event-calendar.css`, plus a new (not originally itemized but
      necessary) `region-page.css` for header/overview-grid/attraction-card/dish-card/cost-summary
      layout and the shared `.media-placeholder` utility. `gallery.css` built but currently unused
      at the time (see above; deleted in Phase 10).
- [x] Verify: clean `npx eleventy` build, all 6 pages generate; Jeju-do's zero-event empty state
      confirmed as the *only* empty-state trigger across all 6 pages (grepped for false positives —
      none); cities+events grid confirmed exactly 2-col (418px/418px, no overflow) at exactly 900px
      via `claude-in-chrome` + DevTools-preset-on-tab; tab anchor navigation confirmed functional
      (click → URL fragment updates → target section scrolls into view below the sticky nav via
      `scroll-margin-top`); attraction horizontal-scroll confirmed via `scrollWidth` (692px) >
      `clientWidth` (380px) with `scroll-snap-type: x mandatory`; zero console errors across every
      page/width checked. One real bug found and fixed along the way: `tabs.njk`'s `<ul>` had no
      class, so the base CSS reset (`ul[class] { list-style: none }`, which requires a class
      attribute) didn't strip bullets — fixed directly in `tabs.css` instead of the reset.

## Phase 7 — Remaining static pages ✅
Goal: the two remaining `site.json` nav destinations exist and render real data.

- [x] `visa-info.njk` — thresholds table (computed live from `visaRules.gniPerCapitaKrw` ×
      each age band's multiplier, not hardcoded numbers) + family multiplier + insurance/age/
      stay-length/conversion facts from `visaRules.additionalFacts`, plus the `disclaimer` string
      rendered via `.empty-state`. New `.table-scroll` wrapper (`overflow-x:auto`) around the
      threshold table so it degrades to horizontal-scroll instead of breaking page width on
      narrow screens — no separate breakpoint needed.
- [x] `communities.njk` — from `communities.json`; each card links out only when `url` is
      non-empty (`{% if c.url %}`), since every current entry is a `MOCK` placeholder with an
      empty `url` — renders as plain (non-link) text until real links are sourced. Empty-state
      partial wired in for the zero-communities case even though it doesn't trigger today.
- [x] New `assets/css/components/static-pages.css` (table + community-card styling only; reuses
      `.region-header`/`.region-section`/`.cost-summary`/`.mock-note`/`.data-provenance`/
      `.empty-state` from `region-page.css` rather than duplicating them), wired into
      `layouts/base.njk`.
- [x] Confirmed nav (`site.json`) — all 4 links now resolve: `/`, `/visa-info/`, `/communities/`
      all pre-existed or were just built; `/#map` was a **dead in-page anchor** (no element had
      `id="map"` anywhere) until this phase — fixed by adding `id="map"` to `index.njk`'s
      `<section class="region-infographic">`, which stays in the DOM (only its columns/lines are
      CSS-hidden below the 768px breakpoint) so the anchor resolves at every width.
- [x] Verify: clean `npx eleventy` build, both new pages 200 over `eleventy --serve`, computed
      threshold values checked in the built HTML (18–34 capital ₩78,615,000, 35+ capital
      ₩104,820,000, etc. — GNI × multiplier, matches `visaRules.json`, off by a few thousand KRW
      from architecture.md §7's own rounded prose figures, which is expected since the JSON is
      the source of truth here, not the doc prose). Visually checked via `claude-in-chrome` at
      the wide default viewport — both pages render cleanly, zero console errors. Narrow-width
      check done via a targeted JS simulation (not a full device-preset pass, since this content
      is plain block-flow reusing already-verified patterns, not new width-driven layout): forced
      a 360px container width and confirmed the visa-threshold table's `scrollWidth` (480px)
      overflows its `.table-scroll` wrapper (328px) via `overflow-x:auto` **without** the page
      itself gaining horizontal scroll (`body.scrollWidth` stayed at 360px) — the one real
      overflow risk on these two pages is contained correctly.

## Phase 8 — API stub layer (local mock endpoints, not live yet) ✅
Goal: `functions/api/**` file structure exists and returns the same shape live KTO calls will
later return, sourced from the Phase-1b mock JSON — this makes the eventual live-call swap
(a separate, compliance-driven follow-up TODO) a drop-in replacement, without doing any real
KTO integration now.

- [x] `functions/api/lib/region-map.mjs` — real logic, small/self-contained. Imports
      `regions.json` directly (`with { type: "json" }`) rather than duplicating the
      `ktoLDongRegnCds` lists, so the Function layer and the editorial data can never drift.
      Exports `REGION_SLUGS`, `isValidSlug(slug)`, `slugToLDongRegnCds(slug)`,
      `lDongRegnCdToSlug(code)`. Verified directly in Node: all 6 slugs resolve, `41 →
      gyeonggi-do`, unknown code → `null`.
- [x] `functions/api/lib/kto-client.mjs`, `normalize.mjs` — stub/pass-through only, per scope.
      `fetchKto()` throws a clear "Phase 8 stub" error (nothing calls it yet); the three
      `normalize*` functions are identity pass-throughs. Both carry comments pointing at
      architecture.md §5 for what the real versions need to do (URL building/paging/backoff;
      title-split/https-rewrite/HTML-strip/license-filter/lDongRegnCd→slug).
- [x] `functions/api/region/[slug]/{attractions,events,gallery}.js` — each imports its
      Phase-1b mock JSON directly, filters by `params.slug`, returns the array via
      `Response.json()`; 404 with a JSON error body for an unknown slug (checked via
      `region-map.mjs`'s `isValidSlug`). Response shape is a bare `Attraction[]`/`Event[]`/
      `Gallery[]` array — matching exactly what the region-page templates already consume via
      the `byRegion` filter — so the eventual live swap only changes what populates the array,
      not the shape callers see.
- [x] Verify: ran `npx wrangler pages dev _site --port 8788` (via `npx`, not added to
      `package.json` — Cloudflare Pages Functions are already the chosen deploy target per
      architecture.md §2, and this is a one-off local check, not a new project dependency) and
      hit all three endpoints for real: `attractions` for gyeonggi-do returns real mock records,
      `events` for jeju-do returns `[]` (the designed empty state, not a bug — matches Phase 6),
      `gallery` for gangwon-do returns real mock records, and an unknown slug returns
      `404 {"error":"Unknown region slug: nope"}`. All via actual HTTP requests against the
      Workers runtime, not just reading the source.

## Phase 9 — Full local build verification ✅
Goal: one final, whole-site pass now that every phase (0–8) exists together, catching anything
that only shows up at integration time rather than per-phase.

- [x] Full `npx eleventy` build — clean, 9 pages written (`/`, `/visa-info/`, `/communities/`,
      6× `/regions/<slug>/`).
- [x] Browsed every page locally end to end via `claude-in-chrome` (dev server on :8080): home,
      all 6 region pages (including jeju-do, the zero-events region), `/visa-info/`,
      `/communities/` — **zero console errors on any of the 9 pages**.
- [x] Click-through / dead-end check, done two ways:
      1. **Exhaustive static link audit** (script, not manual sampling): parsed every generated
         `_site/**/*.html` file for every internal `href`/`src`, resolved each against the real
         build output on disk, and for every `#hash` link confirmed the target `id` actually
         exists on the right page. Covers **100% of internal links across all 9 pages** — nav,
         footer, region-map SVG links, region-card "Learn more" links, tab anchors, asset links.
         **Result: 0 dead links, 0 missing anchor targets.** This is effectively the literal
         "does it work with JS disabled" check, since it operates on the server-rendered HTML
         with no JS execution involved at all — stronger than a manual click pass for that
         specific question.
      2. **Live browser spot-check** on top of that: navigated a region page and clicked the
         Attractions/Living Info tab anchors for real (via `computer` click, not just reading
         the `href`) — confirmed `location.hash` updates and `scrollY` moves to the correct
         section under the sticky tab nav both times. One tooling note: the `ref`-based click
         action (using an element reference from `find`/`read_page`) silently failed to trigger
         navigation twice in a row this session, while a literal pixel-coordinate click on the
         same element worked immediately — a `claude-in-chrome` tool quirk this session, not a
         site bug (confirmed by the coordinate click succeeding on the identical element).
- [x] Confirmed every KTO-derived block shows its provenance note: grepped all 6 region pages,
      `.data-provenance` appears exactly twice on each (once for Attractions, once for the event
      calendar) — 12/12 as expected. Confirmed the designed empty state is genuinely exercised:
      jeju-do's event calendar renders its `.event-calendar__empty-note` (no other region
      triggers any empty-state variant, since cities/attractions/food mock data covers all 6
      regions — the event calendar is the only block with real region-to-region variation).
- [x] Gaps found during this pass (none blocking, all with a concrete home in `ROADMAP_TODO.md`):
      - **No custom 404 page** (`src/404.njk` → `_site/404.html`) exists yet. → Phase 19.
      - `.empty-state`'s CSS class is now doing double duty: its original purpose (a dashed-box
        "nothing here" indicator, still used that way in `communities.njk`/`region.njk`) versus
        its reuse on `visa-info.njk` as a plain disclaimer-text treatment (Phase 7). Not a bug —
        the dashed-box look reads fine as a "fine print" treatment too — but if a real
        empty-state and a disclaimer ever end up on the same page, consider a second class name
        so they don't visually collide. → Phase 26.
      - True browser-level "JavaScript fully disabled" testing (e.g. via a DevTools setting or
        `chrome://` flag) was still not performed via automation — same tool gap noted since
        Phase 2. Confidence here rests on the exhaustive static link audit above (which is
        JS-independent by construction) plus the fact that every interactive affordance sitewide
        traces to a real `<a href>`, verified per-phase (2/3/6/9). → Phase 26 (scoped there to
        the calculator and region-page KTO content specifically, since this sitewide nav/tabs/map
        baseline is already closed by the link audit above).

---

## Phase 10 — Minor style/UX fixes ✅
Goal: fix the three things that already read as wrong even at scaffolding fidelity, without
waiting on the bigger feature work in `ROADMAP_TODO.md`. CSS/JS-only, no data models touched.

- [x] **Region-page tabs: real tab-switching, not anchor-scroll.** `tabs.js` now progressively
      enhances `tabs.njk`'s real anchor links into a proper single-panel ARIA tablist: on load
      (if JS runs), `role="tablist"`/`"tab"`/`"tabpanel"` + `aria-selected`/`aria-controls` are
      added, all but the active `.region-section` get `hidden`, clicking a tab calls
      `preventDefault()` and swaps the visible panel via `history.replaceState` (no page jump,
      URL hash still stays in sync for deep-linking), and Left/Right arrow keys move focus
      between tabs (roving `tabindex`). Direct-loading a URL with `#attractions` etc. activates
      that tab and focuses the panel on load. **Without JS, nothing changed** — `tabs.js` bails
      out before touching the DOM if the expected structure isn't found, so the Phase 6 baseline
      (all sections visible, anchors just scroll) is the literal no-JS fallback, not a
      simulation of it. Active/inactive tab styling (`tabs.css`) is scoped behind a new
      `.js-tabs-ready` class on `<body>` (same pattern as `nav.js`'s `.js-nav-ready`) so the
      no-JS baseline still renders all tabs identically bold/equal, not permanently "muted."
- [x] **Region-page content: center it — later generalized to a shared `.content-page`
      utility.** New `--content-reading-width` token (`860px`, tokens.css) distinct from the
      existing `--content-max-width` (`1200px`, the outer header/footer shell). Initially applied
      as `.region-page` scoped to `region.njk` only; when the user asked for `visa-info.njk` and
      `communities.njk` to match, the rule was moved to base.css as a generic `.content-page`
      class (`max-width: var(--content-reading-width); margin: 0 auto;`) and all three templates
      now share it. `.region-header`'s existing narrower `65ch` cap still nests inside it for
      intro text specifically.
- [x] **"Regions" nav item — removed, final decision reversed from the original draft.** A
      `/regions/` index page was considered (and briefly planned as a roadmap phase) but
      rejected: regions should be navigable from the map only, everywhere. `site.json`'s nav is
      now 3 items (Home, Visa Info, Communities) — no dead/placeholder-destination link.
- [x] **Region-page tabs restructured from 3 to 2** (post-Phase-10 user feedback, folded in here
      since it's the same "minor style/UX fix" category): Overview now contains cities+calendar
      (unchanged) followed by Attractions and Local food as stacked blocks within the same tab;
      Living Info keeps only Cost-of-living + Getting-around. `.living-info__block` renamed to
      the now-more-accurate `.region-block` since it's used in both tabs. Provenance note on
      Attractions preserved in its new location.
- [x] **Dead Gallery UI code deleted** (`gallery.njk`, `gallery.css`, `gallery.js`, plus their
      wiring in `main.js`/`base.njk`) — zero templates referenced them since the Phase 6 decision
      to fold Attractions into the gallery-view pattern instead of a separate Gallery tab, and
      Nature Activities (the other originally-imagined consumer) is cut in `ROADMAP_TODO.md`.
      `mock.gallery` data and the `functions/api/region/[slug]/gallery.js` endpoint are **kept**
      — still a live roadmap item (Phase 21/22), a decision for Phase 14's hero-image-source
      call, not dead code. `architecture.md`'s folder listing and §8 state-management note
      updated to match; its `functions/api` and KTO-caching references to gallery are untouched
      since those are still accurate.
- [x] Verify: clean `npx eleventy` build, zero console errors on a region page load. Real-browser
      click-through confirmed via `claude-in-chrome`: clicking Attractions/Living Info sets
      `location.hash`, correctly hides/shows exactly one `.region-section` at a time
      (`hidden` boolean checked directly per-panel, not inferred from a screenshot),
      `aria-selected` toggles correctly, and — the actual point of this fix — `scrollY` stays at
      `0` on click instead of jumping down the page. Direct-URL-with-hash load into a **fresh
      tab** also verified correct (a same-tab hash-only navigation doesn't trigger a real reload
      in any browser, so that specific check needed a new tab to be meaningful — noted here so a
      future session doesn't mistake that non-reload behavior for a `tabs.js` bug).
      Centering verified via a forced-narrow-width JS simulation (390px): `.region-page` shrinks
      to fit inside the padded viewport with zero page-level horizontal overflow
      (`body.scrollWidth` stayed at 390), and the existing 900px overview-grid 2-column
      breakpoint still triggers correctly (it's viewport-width-driven, not container-width-driven,
      so narrowing the reading column doesn't disable it — the grid just renders narrower).
      A full manual DevTools-preset visual pass at the three exact rule-7 breakpoints was not run
      this phase (JS-state verification + one narrow-width simulation only) — that check now
      belongs to `ROADMAP_TODO.md` Phase 27, which explicitly carries it forward. Scaffolding's
      own scope for this phase is closed.
