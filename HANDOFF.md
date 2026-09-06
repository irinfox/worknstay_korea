# Redesign handoff — feature/website-redesign2

Branch: `feature/website-redesign2` (clean, off main). Attempt-1 is parked on its own branch; do
not consult it. Hard stop **2026-09-09**.

Two companion files, both required reading, neither replaced by this one:
- `DESIGN.md` — what the design *is* (palette, type scale, geometry, component rules). Constant.
- `HANDOFF.md` — what to *do*. Task state lives in the checkboxes below. Update them.

---

## How to run a session

### Paste this as your first message each session

> Read `CLAUDE.md`, `DESIGN.md` and `HANDOFF.md`. Work only on task **NN** below.
> Respect the no-touch list. When the task's acceptance checks pass, tick its box in
> `HANDOFF.md`, list the `git add` paths and a commit message, and stop. Do not start the
> next task. Do not refactor anything the task does not name.

### Rules for the session (Claude reads these itself)
- **No new filters or shortcodes** unless the task can't be done with the existing ones
  (`inlineSvg`, `krw`, `findBySlug`, `byRegion`, `isArray`). Say why before adding one.
- **`design-reference/` needs no Eleventy ignore** — it sits outside the `src` input directory.
- **One task per prompt.** Fresh session every 2–3 tasks, or whenever context passes ~40%.
- **Stop at every checkpoint** (marked `⏸ CHECKPOINT` below). Do not continue past one. At a
  checkpoint: run the viewport pass, report what you changed, then give the `git add` path list
  and a commit message and stop. The user commits, not you (CLAUDE.md workflow constraint).
- Never paste design values into chat — they are in `DESIGN.md` and in the reference file.
- The reference for layout and styling is the design file (`Worknstay Redesign.dc.html`, in the
  design project, not this repo). It is **inline-styled by construction** — that is an artifact of
  how it was authored, *not* a target. Port values into the existing hand-written CSS files under
  `src/assets/css/`, following whatever conventions are already there. Do not introduce a token
  file, a CSS framework, or a new build step (CLAUDE.md rule 1).
- The reference is authoritative for **layout, spacing, colour, type and section order**.
  It is **not** authoritative for **copy or data** — every string comes from `src/_data/*.json`.

---

## No-touch list

Do not modify, regenerate, "clean up" or reformat:

1. **`src/_data/*.json`** — verified content. Three exceptions, and only these:
   - `regions.json`, `cities.json` — may overwrite `activityTags`, `vibeTags`, `summaryTags`
     with the fresher values from the design (task 01 only).
   - `site.json` — may overwrite page names and nav labels (task 01 only).
2. **`src/assets/img/`, `src/assets/svg/`** — maps and photos, homepage and region. No renames,
   no re-exports, no new placeholder assets.
3. **Calculator, map and calendar — behaviour only.** Frozen: the API calls, the input→threshold
   comparison and which message it produces, map region navigation and the eligibility states it
   drives, and calendar pagination logic. **Not frozen — restyle these fully from the design:**
   all of their markup, CSS, layout, spacing, type, colour, states and empty states. The visual
   side of the calculator, map and calendar is squarely in scope; only the functions behind them
   are untouchable. If a visual change needs a hook the JS doesn't expose, add a class or
   attribute rather than altering logic — and say what you added.
4. **`functions/api/**`** — KTO proxy layer. Festivals and attractions calls are verified.
   Presentation of their output is in scope; the fetching is not.

5. **`CLAUDE.md`** — never edit. It is the project's standing agreements, not a scratchpad.
   Propose changes in chat; the user makes them.
6. **`architecture.md`** — a decisions record. Do not rewrite, reorganise or narrate into it.
   If a task produces a genuine architectural decision, append one concise entry with a
   one-line "why", and never reference `ROADMAP_TODO.md` phase numbers inside it.
7. **`.dev.vars`, `.env`, any KTO key** — never read, echo, paste, log, commit, or inline into
   `src/`, `_site/`, a template, or a chat message. Never add a key to an example or fixture.
   If a task appears to need a key value, it does not: stop and say so.
8. **`design-reference/`** — the design file is read-only reference. Do not edit it, do not let
   Eleventy build it into `_site/`.

If a task looks like it needs one of these changed, stop and say so instead.

---

## Decisions already made (override in one line if wrong)

- **Nav:** `Regions · Visa info · Settling in · About`. "Settling in" **is** the existing
  Communities tab, renamed — same page, same route, new label. Rename the label in `site.json`
  only; do not move, rename or re-route `/communities/`, and do not create a new page for it.
- **Region page section order:** design order, minus anything unbuilt —
  cover gallery → map → guides → cities → costs + festivals (one tinted band) → attractions →
  dishes → footer. Same order on both viewports.
- **Missing data is normal.** Gangwon-do is the only fully-populated region. The other five must
  render exactly like it with the unavailable blocks *absent*, never empty-framed and never
  filled with invented content. See "Graceful-empty rules" below.
- **Scope:** Homepage, region page, About (**new page — does not exist yet**), 404 / empty states.
  City detail, Visa info and Settling in / Communities keep their current styling this round.

---

## Graceful-empty rules (apply to every task)

A block with no data is **omitted entirely** — no heading, no empty card, no "coming soon".
The exceptions are the two KTO blocks, which CLAUDE.md rule 5 requires to have designed empty
states: festivals and attractions render their heading plus a one-line empty state.

- `longIntro` is a **string** on five regions and an **array of two paragraphs** on Gangwon-do.
  This is **already handled** — `eleventy.config.js` has an `isArray` filter and `region.njk`
  renders both forms. Keep using it; do not normalise the data, add a second filter, or rewrite
  that branch.
- `activityTags` / `seasonTags` / `usefulLinks` exist only on Gangwon-do. Absent → the whole row
  is omitted, and the elements below close the gap (no reserved blank space).
- Map and guides are **optional per region**, per the same rule.
- Never emit a `MOCK` or `PLACEHOLDER` value into rendered output. If a field carries one, treat
  it as absent and omit the block.

---

## Viewport pass (the standard set)

Run at every checkpoint, not only at the end. Four widths:

| Width | Expectation |
| --- | --- |
| 1280px | Desktop reference — matches the design file |
| 900px | **Must still read as desktop**, not a collapsed phone layout |
| 390px | Phone reference — matches the design file's phone frame |
| 360px | Minimum — nothing clipped or overflowing (CLAUDE.md rule 7) |

Also at each checkpoint: contrast (text 4.5:1, full-opacity ink over photos), tap targets ≥44px
on phone, nothing below 12px, and no horizontal scroll at any width.

---

## Exact spacing (from the reference — use these, do not eyeball)

Desktop frame 1280px · page padding 40px · phone frame 390px · page padding 16px.

| Where | Value |
| --- | --- |
| Page section stack gap | `32px` |
| Section block padding | `44px 40px` |
| Nav row padding | `20px 0 0`, wordmark↔dot gap `9px`, nav item gap `28px` |
| Headline rule | `56×3px` `#E08A2E`, `24px` above H1 |
| H1 → Korean name | `10px` |
| Vibe tag row | gap `5px`, tag padding `3px 9px`, radius `20px` |
| Intro paragraph stack | `14px` |
| Card grid (region cards) | `grid-template-columns:262px 1fr 262px`, gap `20px` |
| Card internal | padding `14px 16px`, radius `10px`, border `1px #E4E7E4` |
| Card footer row | `margin-top:11px; padding-top:9px; border-top:1px solid #EDF0EE` |
| Calculator card | padding `20px`, radius `12px`, field row gap `10px`, salary field `196px`, control height `42px` |
| Calculator result plate | `margin-top:14px`, padding `13px 15px`, radius `8px`, bg `#EAF4EF` |
| Note plate | padding `13px 16px`, radius `10px`, icon↔text gap `12px` |
| Map panel | height `560px`, radius `12px`, bg `#F7F9F8` |
| Legend row | gap `16px`, swatch `10×10px` radius `3px`, swatch↔label gap `6px` |
| Section heading → content | `18px` |

Everything else: `DESIGN.md` § Geometry and § Type. Nothing below 12px. Phone tap targets ≥44px.

---

## Tasks

Tick the box, then stop.

- [x] **01 — Data prep + nav.** Overwrite `activityTags` / `vibeTags` / `summaryTags` in
  `regions.json` and `cities.json` with the design's fresher values; update the cost figures the
  design carries; set the nav and page labels in `site.json` to the decided set. Data only — no
  template or CSS changes in this task.
  *Checks:* `npm run build` clean; no `MOCK`/`PLACEHOLDER` introduced; Gangwon-do's existing
  verified `longIntro` and `seasonTags` untouched.

- [x] **02 — Dark nav + footer.** `#16201C` bar, wordmark with `#54C79A` dot, links 75% white,
  active white with 2px `#E08A2E` underline. Footer disclaimer from `site.json`.
  *Checks:* renders on every page; keyboard-navigable; JS disabled still fine (CLAUDE.md rule 6).

⏸ **CHECKPOINT A** — viewport pass, then stop for review.

- [ ] **03 — Homepage hero + calculator.** Cover photo behind header and headline, calculator card
  overlapping the photo's lower edge. Restyle the calculator completely from the design — card,
  field row, salary field width, control height, checkbox, reset link, result plate. The
  comparison logic and its messages are frozen; everything visual is not.
  *Checks:* 1280 / 900 / 390 / 360px; same inputs still produce the same messages; result plate styled
  per the design; no logic edits in the diff.

- [ ] **04 — Homepage map + legend + region cards.** Three-column grid, legend, "Partly eligible"
  note plate, six region cards each ending in an `Open <region> →` row on a hairline.
  Ineligible regions stay non-navigable (CLAUDE.md feedback log).
  *Checks:* hover card ↔ map highlight both ways; phone falls back to the dynamic card per the
  existing width breakpoint; every region link is a real `<a href>`.

⏸ **CHECKPOINT B** — viewport pass, then stop for review.

- [ ] **05 — Region page headline block + cover gallery.** Orange rule → H1 → Korean name →
  vibe tags → intro paragraphs, then the gallery. Reuse the existing `isArray` branch in
  `region.njk` for `longIntro` — restyle it, don't replace it.
  *Checks:* Gangwon-do matches the reference; one other region renders with no `activityTags` and
  no visible gap.

- [ ] **06 — Region page body sections.** Map, guides, cities, costs + festivals in one tinted
  band, attractions, dishes — in the decided order, both viewports. Festivals keep their
  pagination, fixed reserved height, tag chips and copy-address control (44px on phone).
  *Checks:* a region with zero upcoming festivals shows the designed empty state, not a gap; no
  reflow jump when paging festivals; attractions and festivals still hit the live proxy.

⏸ **CHECKPOINT C** — viewport pass, then stop for review.

- [ ] **07 — Build the About page.** It does not exist in the repo yet — create it, matching the
  design's About page exactly (layout, section order, spacing, type). Copy comes from
  `src/_data/*.json`, not from the reference file's placeholder text; if a needed string has no
  home in `_data`, add it to `site.json` and say which keys you added.
  *Checks:* matches the reference at 1280px and 390px; nav and footer present; no copy invented.

- [ ] **07b — 404 page.** **There is no design for this page** — do not invent a layout and do not
  copy one from elsewhere. Build it from the system only, exactly this and nothing more:
  dark nav → orange `56×3px` rule → H1 "Page not found" → one line of body text → two text links
  (`Home` and `Regions`, green, underlined) → footer. Page section stack gap `32px`, block
  padding `44px 40px`. No illustration, no card, no search box, no suggested-content grid.
  *Checks:* nav and footer present; nothing on the page that isn't in the list above.

- [ ] **07c — Empty-state sweep.** Review every empty state introduced in tasks 02–07b for
  consistency of wording and styling. Report inconsistencies before changing them.
  *Checks:* one wording pattern across all of them; no orphaned CSS.

⏸ **CHECKPOINT D** — viewport pass, then stop for review.

- [ ] **08 — Final pass.** Full viewport pass across every page in scope, plus a real iOS Safari
  pass (CLAUDE.md rule 7).
  *Checks:* list what you tested and what you changed; no new CSS files; no file from the
  no-touch list in the diff.

---

## Definition of done

Every box ticked, `npm run build` clean, `npm run pages:dev` serves all pages in scope, KTO
blocks still calling live, and no file from the no-touch list in any diff.
