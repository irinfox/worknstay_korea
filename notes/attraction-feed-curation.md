# Note: attraction feed quality — needs deeper research

Status: **quick fix applied, real solution deferred.** Written after a first pass on
2026-08-28. Re-read and rethink before Phase 24 curation.

## The problem

The deployed region-page "Attractions" lists look wrong — full of shoe-repair streets,
"Cocory Color Research Institute" (×4 branches), brewery outlets, and plastic-surgery /
dental clinics. The famous landmarks a newcomer would expect (the five Seoul palaces,
Hwaseong, Bukchon, N Seoul Tower) are missing entirely.

## What we found (empirically, against the live EngService2 key)

1. **`arrange` was mislabeled in our code.** `attractions.js` used `arrange=Q` with a comment
   claiming "view-count order". It is not. KTO's documented `arrange` codes:
   - `A`/`O` = title order (O = representative image required)
   - `C`/`Q` = **modified-date order** (Q = image required)  ← what we had
   - `D`/`R` = created-date order (R = image required)
   - `B`/`P` = **view-count order** (P = image required) — *works but undocumented*; the
     official spec sheet omits B/P entirely.

   So our feed was "the N most recently-edited records that have a photo" per area code —
   i.e. whatever a KTO editor last touched. Stable landmark records (rarely edited) sink.

2. **Even with the right sort, a small row window can't reach the landmarks.** Seoul
   (`lDongRegnCd 11`) has 455 records under `contentTypeId 76`. Under view-count sort:
   - Gyeongbokgung ranks **#32**, Deoksugung / Changdeokgung / Changgyeonggung further down.
   - All five palaces have images and `Type1` licenses — they render fine, they're just
     never fetched.
   Bumping `ROWS_PER_CODE` from 12 → 25 does not fix this (still short of #32) and roughly
   doubles the junk + the horizontal-scroll list length (Gyeongsang-do: ~125 cards).

3. **Sort order does not remove medical-tourism venues.** KTO files plastic-surgery /
   dental / oriental-medicine clinics and medical-tourism agencies under `contentTypeId 76`.
   - `cat3 === "A02020500"` (KTO's 의료관광 category) is **100% medical venues** across all
     six region feeds — 0 real attractions. Reliable exclusion key.
   - A few slip through with **empty** `cat1/cat2/cat3` (e.g. "She's Plastic Surgery
     Clinic" in Busan) — need a name-regex fallback for those.
   - Worst region: Gyeongsang-do, 11 medical venues in a 25-row×5-code pull.

## What we changed (the quick fix — commit on `main`)

`functions/api/region/[slug]/attractions.js`:
- `ARRANGE`: `Q` → `P` (view-count + image).
- `ROWS_PER_CODE`: `12` → `15`.
- Added `isMedicalVenue(raw)`: drop if `cat3 === "A02020500"` OR title matches
  `/병원|의원|한의원|성형외과|치과|피부과|안과|clinic|hospital|plastic surgery|dermatolog/i`.
- Fixed the stale `arrange` comment.

Also updated `architecture.md` §5 and `ROADMAP_TODO.md` Phase 24.

**Known cost of the regex:** "Seoul Daehan Hospital" (서울 대한의원) is a registered historic
building / medical museum and gets filtered out because its Korean name contains `의원`.
Acceptable for now; a whitelist would bring it back deliberately.

## The open question — blacklist vs whitelist

Blacklisting (what we did) fights an algorithmic feed record-by-record and will always be a
step behind: new junk categories, mis-categorised records, the "no category code at all"
long tail. It also can't *add* the landmarks that the sort never surfaces.

**A per-region curated allowlist is probably the right model:**
- Hand-pick ~8–15 `contentId`s per region (the sites a resident would actually point a
  visitor to), stored in `src/_data/*.json` per CLAUDE.md rule 4.
- Fetch those explicitly (batch `detailCommon2`, or resolve once and cache), render them
  first, then optionally pad with the top few algorithmic results below a divider.
- Cost: one-time research per region (6 regions), plus re-checking `contentId` stability.
- Upside: predictable, junk-free, on-message for Task #4 ("living here", not a KTO dump),
  and the provenance story stays clean (still live KTO calls, just for chosen IDs).

Downside / things to check:
- Are `contentId`s stable across KTO re-imports? (Spot-check a few over the dev window.)
- Does `detailCommon2` per ID blow the call budget? (1000/day dev key; edge-cache 24h ⇒
  ~6 regions × 15 IDs once per day = trivial. Probably fine.)
- Do we still want *any* algorithmic tail, or is a pure curated list cleaner?
- Whitelist maintenance burden vs. contest timeline — is this a v1 thing or post-MVP?

## Research TODO (before committing to the whitelist)

- [ ] Confirm the real meaning of `arrange=B`/`P` — find a KTO source, or accept "undocumented
      but works" and note the risk (if KTO drops it, `kto-client` degrades → attractions
      vanish silently; consider a `Q` fallback).
- [ ] Check whether `contentTypeId 12` (courses) / `25` / `85` etc. renumbering notes in
      §5 are all still accurate for v4.
- [ ] Decide the content mix: pure 관광지 (76), or blend in 문화시설 (78 — museums, galleries,
      local history halls; cleaner "resident culture" flavour but lower volume, more `Type3`
      images, no marquee pull). See the 76-vs-78 comparison done 2026-08-28.
- [ ] Draft the per-region allowlist for one region (Gangwon or Jeju — single code, easiest)
      as a spike, see how it feels on the page.
- [ ] Revisit `ROWS_PER_CODE` and whether `renderAttractions` should cap the list length
      (currently renders everything the endpoint returns; Gyeongsang-do is long).
- [ ] **No-image rate under `arrange=P` is high** (~40% of the Gyeongsang-do list has no
      `firstimage` → `.media-placeholder` grey box, e.g. Busan Tower). Decide: drop no-image
      records in the endpoint (guarantees clean cards, but omits some real sites), accept the
      placeholders, or moot once the whitelist lands. `P` may not actually enforce
      "representative image required" the way the docs imply for O/Q/R.
- [ ] `detailCommon2`/`detailIntro2` would also give us `Attraction.summary` and
      `Event.homepageUrl` (currently `""` — see ROADMAP Phase 21) — worth doing in the same
      pass if we're calling detail endpoints for the allowlist anyway.
