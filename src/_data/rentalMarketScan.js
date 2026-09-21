// Per-city short-term rental market research: what a listing actually costs, broken down by
// platform (Zigbang, Enkostay, "33m2", Airbnb). This is the raw price scan behind the region
// page's "Cost of living" summary paragraph.
//
// `scans` is one flat array across all regions (same convention as cities.json/food.json —
// filter by regionSlug) — add more regions here as they get scanned.
//
// This is a single-day manual scan across a handful of listings per platform, not a statistical
// average — sample size is small and "very few" is noted wherever the researcher saw that.
//
// Each unit only carries `type` (for the byName lookups in settling-in.njk), `sizeM2` and
// `label` — the reviewed, hand-finalized display strings for the settling-in page's
// price-snapshot table (Settling in.dc.html). There used to be separate depositMin/depositMax/
// rentMin/rentMax numeric fields alongside `label`, but they were never read anywhere (the page
// only ever renders `label.*`) and didn't actually hold a real observed min/max — they were the
// same single eyeballed figure as `label`, just reformatted, which made the file look like it had
// verified range data it didn't. Removed rather than kept as unused, misleading duplication.
//
// `regionSummary` holds the one hand-checked figure surfaced outside this page (homepage region
// cards, the Gangwon-do region page's rent-summary card and cost dl) — kept here rather than in
// its own file since it's the same market-scan research, just rolled up to a single region-level
// number instead of per-city/per-platform.
export default {
  regionSummary: [
    {
      regionSlug: "gangwon-do",
      furnishedShortTermMonthly: "₩1–1.4M",
      source: "Hand-checked from current furnished short-term listings, September 2026"
    }
  ],
  scans: [
    {
      regionSlug: "gangwon-do",
      citySlug: "sokcho",
      asOf: "2026-09-02",
      source: "Direct market scan by site author (Zigbang, Enkostay, 33m2, Airbnb listings)",
      sourceUrl: "",
      note: "Widest range of available listings among the four Gangwon-do cities scanned.",
      platforms: [
        {
          name: "Zigbang",
          currency: "KRW",
          units: [
            { type: "Officetel", sizeM2: null, label: { size: "—", deposit: "₩1–3M", rent: "₩600K" } },
            { type: "One-room", sizeM2: 23, label: { size: "23 m²", deposit: "₩4–6M", rent: "₩300–400K" } }
          ]
        },
        {
          name: "Enkostay",
          currency: "KRW",
          units: [{ type: null, sizeM2: null, label: { size: "—", rent: "₩900K–2.5M" } }]
        },
        {
          name: "33m2",
          currency: "KRW",
          units: [{ type: null, sizeM2: 26, label: { size: "26 m²", rent: "₩1.2–1.6M" } }]
        },
        {
          name: "Airbnb",
          currency: "USD",
          units: [{ type: null, sizeM2: null, label: { rent: "~$1,000" } }]
        }
      ]
    },
    {
      regionSlug: "gangwon-do",
      citySlug: "gangneung",
      asOf: "2026-09-02",
      source: "Direct market scan by site author (Zigbang, Enkostay, 33m2, Airbnb listings)",
      sourceUrl: "",
      note: "",
      platforms: [
        {
          name: "Zigbang",
          currency: "KRW",
          units: [
            { type: "Officetel", sizeM2: 30, label: { size: "30 m²", deposit: "₩3M", rent: "₩500K" } },
            { type: "One-room", sizeM2: 30, label: { size: "30 m²", deposit: "₩3–5M", rent: "₩400–600K" } }
          ]
        },
        {
          name: "Enkostay",
          currency: "KRW",
          units: [{ type: null, sizeM2: 23, note: "Very few listings", label: { size: "23 m²", rent: "₩2M", noteShort: "very few" } }]
        },
        {
          name: "33m2",
          currency: "KRW",
          units: [{ type: null, sizeM2: 23, note: "Very few listings", label: { size: "23 m²", rent: "₩1.3M", noteShort: "very few" } }]
        },
        {
          name: "Airbnb",
          currency: "USD",
          units: [{ type: null, sizeM2: null, label: { rent: "$1,000+" } }]
        }
      ]
    },
    {
      regionSlug: "gangwon-do",
      citySlug: "chuncheon",
      asOf: "2026-09-02",
      source: "Direct market scan by site author (Zigbang, Enkostay, 33m2, Airbnb listings)",
      sourceUrl: "",
      note: "",
      platforms: [
        {
          name: "Zigbang",
          currency: "KRW",
          units: [
            { type: "Officetel", sizeM2: null, label: { size: "—", deposit: "₩5M", rent: "₩450–700K" } },
            { type: "One-room", sizeM2: 29, label: { size: "29 m²", deposit: "₩2–4M", rent: "₩300–500K" } }
          ]
        },
        {
          name: "Enkostay",
          currency: "KRW",
          units: [{ type: null, sizeM2: null, label: { size: "—", rent: "₩1–1.5M" } }]
        },
        {
          name: "33m2",
          currency: "KRW",
          units: [{ type: null, sizeM2: null, label: { size: "—", rent: "₩1.1–1.4M" } }]
        },
        {
          name: "Airbnb",
          currency: "USD",
          units: [{ type: null, sizeM2: null, note: "Unusually wide/high range in the sampled listings — low confidence, worth re-checking.", label: { rent: "$2,000–4,000" } }]
        }
      ]
    },
    {
      regionSlug: "gangwon-do",
      citySlug: "wonju",
      asOf: "2026-09-02",
      source: "Direct market scan by site author (Zigbang, Enkostay, 33m2, Airbnb listings)",
      sourceUrl: "",
      note: "",
      platforms: [
        {
          name: "Zigbang",
          currency: "KRW",
          units: [
            { type: "Officetel", sizeM2: 50, label: { size: "50 m²", deposit: "₩5M+", rent: "₩200K" } },
            { type: "One-room", sizeM2: 33, label: { size: "33 m²", deposit: "₩3–5M", rent: "₩250–400K" } }
          ]
        },
        {
          name: "Enkostay",
          currency: "KRW",
          units: [{ type: null, sizeM2: null, label: { size: "—", rent: "₩770K–1.4M" } }]
        },
        {
          name: "33m2",
          currency: "KRW",
          units: [{ type: null, sizeM2: 26, label: { size: "26 m²", rent: "₩1M" } }]
        },
        {
          name: "Airbnb",
          currency: "USD",
          units: [{ type: null, sizeM2: null, label: { rent: "$500–750" } }]
        }
      ]
    }
  ]
};
