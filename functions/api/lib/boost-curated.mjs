// Boosts curated attraction picks into live areaBasedList2 results (architecture.md §5) — pure
// function, no KTO calls. Runs per-category bucket
// (nature/culture split independently, then recombined) *before* attractions.js's
// `CATEGORY_PRIORITY` sort; that sort is stable, so the interleave built here survives it.
//
// Priority semantics (confirmed with user):
// - `hard` — must appear somewhere in the first ~3 scroll-pages. If missing from live results,
//   the curated record is injected directly.
// - `soft` — only boosted if it's already present in live results (repositioned earlier); if
//   absent, it's simply not added — no injection.

// Card-width math (region-page.css): mobile cards 210px + 12px gap ≈ 222px/card, ~1-2 visible
// per swipe at 360px → 3 pages ≈ 4-5 cards (the binding constraint). Desktop cards 240px + 12px ≈
// 252px/card → 3 pages ≈ 13-15 cards. Positions 0, 2, 5, 7, 10, … (alternating +2/+3 from 0) put
// the first two picks well inside the mobile budget and keep spreading through the desktop one.
const BOOST_STEP = [2, 3];

// Order categories are recombined in — matches the order attractions.js's own fan-out emits them
// (NATURE_GROUPS before CULTURE_GROUPS). Not load-bearing for the final response (attractions.js
// re-sorts by CATEGORY_PRIORITY right after this runs), kept only for a stable, predictable
// intermediate order.
const CATEGORY_ORDER = ["nature", "culture"];

function boostPositions(count) {
  const positions = [];
  let pos = 0;
  for (let i = 0; i < count; i++) {
    positions.push(pos);
    pos += BOOST_STEP[i % BOOST_STEP.length];
  }
  return positions;
}

function boostBucket(liveBucket, curatedBucket) {
  const liveById = new Map(liveBucket.map((item) => [item.contentId, item]));
  const hard = curatedBucket.filter((pick) => pick.priority === "hard");
  const soft = curatedBucket.filter((pick) => pick.priority !== "hard");

  const boosted = [];
  const usedIds = new Set();

  for (const pick of hard) {
    // Prefer the live object when present (fresher sourceModifiedAt); inject the curated record
    // only when the live fetch genuinely missed it.
    boosted.push(liveById.get(pick.contentId) || pick);
    usedIds.add(pick.contentId);
  }
  for (const pick of soft) {
    const live = liveById.get(pick.contentId);
    if (!live) continue; // soft picks are never injected, only repositioned
    boosted.push(live);
    usedIds.add(pick.contentId);
  }

  if (boosted.length === 0) return liveBucket;

  const remaining = liveBucket.filter((item) => !usedIds.has(item.contentId));
  const positions = new Set(boostPositions(boosted.length));

  const result = [];
  let boostedIndex = 0;
  let remainingIndex = 0;
  const total = remaining.length + boosted.length;
  for (let i = 0; i < total; i++) {
    if (positions.has(i) && boostedIndex < boosted.length) {
      result.push(boosted[boostedIndex]);
      boostedIndex += 1;
    } else if (remainingIndex < remaining.length) {
      result.push(remaining[remainingIndex]);
      remainingIndex += 1;
    } else {
      result.push(boosted[boostedIndex]);
      boostedIndex += 1;
    }
  }
  return result;
}

export function boostCuratedPicks(liveItems, curatedItems) {
  const categories = new Set([...CATEGORY_ORDER, ...liveItems.map((i) => i.category), ...curatedItems.map((i) => i.category)]);

  const out = [];
  for (const category of categories) {
    const liveBucket = liveItems.filter((item) => item.category === category);
    const curatedBucket = curatedItems.filter((item) => item.category === category);
    if (liveBucket.length === 0 && curatedBucket.length === 0) continue;
    out.push(...boostBucket(liveBucket, curatedBucket));
  }
  return out;
}
