# worknstay korea — design conventions

Reference tool, not a magazine or a community site. White ground, quiet type, data first.
The HTML in `Worknstay Redesign.dc.html` is the source of truth for layout and styling —
**not for copy**. Keep the site's existing text; take only structure, styles and section order.

## Palette

| Token | Hex | Use |
| --- | --- | --- |
| Ink | `#16201C` | Body text, dark nav bar, wordmark dot ring |
| Ink soft | `#23342C` / `#33443C` / `#4A544E` | Secondary paragraphs |
| Muted | `#5C6660` | Captions, addresses, source lines |
| Hairline | `#E4E7E4` / `#EDF0EE` | Card borders, row dividers |
| Panel | `#F7F9F8` | Info cards, guides strip |
| Green | `#0F7B54` | Primary accent, in-site links, eligible state |
| Green tint | `#EAF4EF` / `#DCEFE5`, border `#A9D8C2` / `#C9E3D6` | Tinted bands, vibe tags, note plates |
| Green deep | `#0B5C3F` | Vibe-tag text |
| Green light | `#A8D8C2` | "Partly eligible" map fill |
| Orange rule | `#E08A2E` | 56×3px rule above every page headline, 3×15px section ticks |
| Orange text | `#C2531A` | Outbound links, festival dates, spicy tag, "Where to eat it" |

Two accent colours only. Green = ours / easier / in-site. Orange = external / stricter / seasonal.
Max two background tones per page (white + one tint band).

## Type

Instrument Sans 400/500/600. Korean names in Noto Sans KR. No 800 weights, no condensed
display faces, no mono uppercase eyebrows.

- Page H1: 40–44px / 600 / `-0.028em` (phone 30–32px)
- Section H2: 20–22px / 600 / `-0.015em`
- Card title: 16–18px / 600
- Body: 15px / 1.65–1.7
- Caption, source, address: 12–13px, `#5C6660`
- Sentence case everywhere. All-caps only in the festival tag chips.

## Geometry

Radius 10–12px cards, 20–22px pills, 8px inputs. Hairlines 1px. Desktop frame 1280px,
phone frame 390px. Page padding 32px desktop / 16px phone. Section gaps 26–36px.
Flex/grid with `gap` — never margin-spaced inline siblings.

## Recurring parts

- **Dark nav** `#16201C`, wordmark "worknstay korea" with a `#54C79A` dot, links at 75% white,
  active item white with a 2px `#E08A2E` underline. Items: Regions · Visa info · Settling in · About.
- **Breadcrumb** row under the nav, 13px, `Regions / <span ink>Gangwon-do</span>`.
- **Headline block**: orange 56×3 rule → H1 → Korean name → vibe tags → intro paragraphs.
- **Vibe tag**: `#DCEFE5` bg, `#A9D8C2` border, `#0B5C3F` text, 14–15px/600, radius 22px.
  Same style for regions and cities — they mean the same thing.
- **Note plate**: tinted bg, matching border, radius 10px, one line of text + a `→` link.
  Green for "easier", orange for "stricter".
- **Source line**: 12–13px `#5C6660`, always dated, always at the foot of the block it describes.
- **Section tick**: 3×15px orange bar before a small heading (Guides, Where to work).

## Page order (region page — both viewports identical)

cover gallery → map → guides → cities → costs + festivals (one tinted band, costs left,
festivals right) → attractions → dishes → footer.

Homepage: cover photo behind header + headline + calculator (card overlaps its lower edge)
→ map with legend and the "Partly eligible" note → six region cards → footer.

## Component rules

- **Region card** ends with a `Open <region> →` row on a hairline. Hover highlights the matching
  map area; click opens the page. Phone: swipe carousel with dots; tapping the map jumps to a card.
- **City card**: name + Korean name, vibe tags, blurb, then a `#F7F9F8` "Where to work" panel —
  venue name 16–17px/600 with its kind as 12px grey at the right, address below, then
  `Website ↗ Instagram ↗ Naver Map ↗` as underlined text links (never buttons).
- **Study cafés**: 4-cell battery (12–15×9px, `#0F7B54` filled / `#DCE3DF` empty) + count label
  + `Naver Map ↗` at the right of the same row. No description. Row never wraps.
- **Chains**: the chain name is the link (`Fastfive ↗`); no separate domain column.
- **Getting around**: three nearby places + Seoul, journey times in semibold.
- **Guides**: one strip, each link orange underlined with `↗`, domain and date underneath.
- **Festivals**: 5 per page with numbered pagination and a `1–5 of 17 in October` range.
  The list reserves a fixed height so pages swap without moving the page. Tag chips
  (THIS MONTH / LONG-TERM / PEAK SEASON / WINTER). Clipboard icon copies the full address —
  icon + tooltip on desktop, icon + "Copy address" label on phone (44px tap target).
- **Map pins**: 13–15px line pictograms (city / mountain / surf / ski) in ink or green,
  with a label chip. Legend uses the same glyphs. The rectangle is a placeholder for a real
  Korea outline; pins get positioned by coordinate.
- **Dishes**: photo, name + Korean name, note, optional `Where to eat it ↗`. Spicy tag only.

## Copy rules

- Honest labels with their basis: "Furnished short-term, decent and available" — the figure is what a
  decent, actually available furnished place lists for anywhere in the region, not a 1BR city-centre median.
- Every figure dated and sourced ("Hand-checked from current listings, September 2026").
- No marketing slogans, no "handpicked", no unsupported comparisons.
- Consistent names: one term per concept ("Partly eligible", "About", "worknstay korea").
- Dots, not pluses, between qualifiers: `coworking · coliving · community`.

## Accessibility / layout musts

- Text 4.5:1 against its background; full-opacity ink over photos, never alpha-muted.
- Phone tap targets ≥44px.
- Reserve height for anything that changes length (paginated lists) — no reflow jumps.
- Nothing below 12px.
