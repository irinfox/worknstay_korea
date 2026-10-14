// Verification — pure fixtures, no live KTO calls needed. Run with:
//   node scripts/verify-boost-curated.mjs
import { boostCuratedPicks } from "../functions/api/lib/boost-curated.mjs";

let failures = 0;
function check(label, condition, detail) {
  const pass = Boolean(condition);
  console.log(`${pass ? "PASS" : "FAIL"} — ${label}${detail ? ` (${detail})` : ""}`);
  if (!pass) failures += 1;
}

function attraction(contentId, category, extra = {}) {
  return { contentId, category, titleEn: `Live ${contentId}`, sourceModifiedAt: "live", ...extra };
}
function curated(contentId, category, priority, extra = {}) {
  return { contentId, category, priority, titleEn: `Curated ${contentId}`, sourceModifiedAt: "curated", ...extra };
}

// Position 0 is always a hard pick when any exist.
{
  const live = [attraction("l1", "nature"), attraction("l2", "nature"), attraction("l3", "nature")];
  const picks = [curated("l2", "nature", "hard")];
  const result = boostCuratedPicks(live, picks);
  check("position 0 is the hard pick", result[0].contentId === "l2", JSON.stringify(result.map((r) => r.contentId)));
}

// Live version wins on conflict (fresher sourceModifiedAt kept, not the curated stand-in).
{
  const live = [attraction("l1", "culture")];
  const picks = [curated("l1", "culture", "hard")];
  const result = boostCuratedPicks(live, picks);
  check("live object wins when the hard pick is already present", result[0].sourceModifiedAt === "live");
}

// Hard pick injected when absent from live results.
{
  const live = [attraction("l1", "culture"), attraction("l2", "culture")];
  const picks = [curated("missing", "culture", "hard")];
  const result = boostCuratedPicks(live, picks);
  check(
    "hard pick injected when absent from live results",
    result.some((r) => r.contentId === "missing" && r.sourceModifiedAt === "curated"),
    JSON.stringify(result.map((r) => r.contentId))
  );
  check("injecting a hard pick doesn't drop any live items", result.length === 3);
}

// Soft pick omitted (not injected) when absent from live results.
{
  const live = [attraction("l1", "nature"), attraction("l2", "nature")];
  const picks = [curated("missing", "nature", "soft")];
  const result = boostCuratedPicks(live, picks);
  check(
    "soft pick is never injected when absent",
    !result.some((r) => r.contentId === "missing") && result.length === 2,
    JSON.stringify(result.map((r) => r.contentId))
  );
}

// Soft pick repositioned earlier when already present.
{
  const live = [attraction("l1", "nature"), attraction("l2", "nature"), attraction("l3", "nature")];
  const picks = [curated("l3", "nature", "soft")];
  const result = boostCuratedPicks(live, picks);
  check(
    "present soft pick is repositioned to a boosted slot",
    result[0].contentId === "l3",
    JSON.stringify(result.map((r) => r.contentId))
  );
  check("repositioning a soft pick doesn't change the item count", result.length === 3);
}

// Category isolation — a curated nature pick never lands in the culture bucket.
{
  const live = [attraction("n1", "nature"), attraction("c1", "culture")];
  const picks = [curated("nature-hard", "nature", "hard")];
  const result = boostCuratedPicks(live, picks);
  const cultureIds = result.filter((r) => r.category === "culture").map((r) => r.contentId);
  check(
    "a nature curated pick never appears in the culture bucket",
    !cultureIds.includes("nature-hard"),
    JSON.stringify(cultureIds)
  );
  check("culture bucket is untouched when it has no curated picks", cultureIds.length === 1 && cultureIds[0] === "c1");
}

// Empty live category with only curated hard picks — injection still happens per-bucket.
{
  const live = [];
  const picks = [curated("h1", "nature", "hard"), curated("h2", "nature", "hard")];
  const result = boostCuratedPicks(live, picks);
  check(
    "an empty live bucket still gets its hard picks injected",
    result.map((r) => r.contentId).sort().join(",") === "h1,h2"
  );
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
