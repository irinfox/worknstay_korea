// Per-city short-term rental market research: what a listing actually costs, broken down by
// platform (Zigbang, Enkostay, "33m2", Airbnb). This is the raw price scan behind the region
// page's "Cost of living" summary paragraph — distinct from costOfLiving.json, which holds
// separate blended monthly-budget estimates (currently MOCK placeholders) for a different UI
// block (the non-Gangwon "Living Info" tab). Don't merge the two files: different collection
// method, different shape, different consumer.
//
// One flat array across all regions (same convention as cities.json/food.json — filter by
// regionSlug) — add more regions here as they get scanned. Deposit/rent are KRW except Airbnb,
// which is USD (nightly-scaled monthly estimate, no deposit concept). A missing max on a
// min/max pair means the listing was open-ended in the source scan (e.g. "5mln+").
//
// This is a single-day manual scan across a handful of listings per platform, not a statistical
// average — sample size is small and "very few" is noted wherever the researcher saw that.
//
// `label` on each unit is the reviewed, hand-finalized display string for the settling-in page's
// price-snapshot table (Settling in.dc.html) — transcribed verbatim rather than formatted from
// the raw numbers above, because the reviewed copy isn't a pure function of them (e.g. Wonju's
// open-ended Zigbang-officetel deposit reads "₩5M+" while Gangneung's and Chuncheon's read plain
// "₩3M"/"₩5M" with no "+", despite all three having depositMax: null). `label.size` uses a
// non-breaking space between the number and "m²" so it can't wrap mid-value at narrow widths.
export default [
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
          { type: "Officetel", depositMin: 1000000, depositMax: 3000000, rent: 600000, sizeM2: null, label: { size: "—", deposit: "₩1–3M", rent: "₩600K" } },
          { type: "One-room", depositMin: 4000000, depositMax: 6000000, rentMin: 300000, rentMax: 400000, sizeM2: 23, label: { size: "23 m²", deposit: "₩4–6M", rent: "₩300–400K" } }
        ]
      },
      {
        name: "Enkostay",
        currency: "KRW",
        units: [{ type: null, rentMin: 900000, rentMax: 2500000, sizeM2: null, label: { size: "—", rent: "₩900K–2.5M" } }]
      },
      {
        name: "33m2",
        currency: "KRW",
        units: [{ type: null, rentMin: 1200000, rentMax: 1600000, sizeM2: 26, label: { size: "26 m²", rent: "₩1.2–1.6M" } }]
      },
      {
        name: "Airbnb",
        currency: "USD",
        units: [{ type: null, rent: 1000, sizeM2: null, label: { rent: "~$1,000" } }]
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
          { type: "Officetel", depositMin: 3000000, depositMax: null, rent: 500000, sizeM2: 30, label: { size: "30 m²", deposit: "₩3M", rent: "₩500K" } },
          { type: "One-room", depositMin: 3000000, depositMax: 5000000, rentMin: 400000, rentMax: 600000, sizeM2: 30, label: { size: "30 m²", deposit: "₩3–5M", rent: "₩400–600K" } }
        ]
      },
      {
        name: "Enkostay",
        currency: "KRW",
        units: [{ type: null, rent: 2000000, sizeM2: 23, note: "Very few listings", label: { size: "23 m²", rent: "₩2M", noteShort: "very few" } }]
      },
      {
        name: "33m2",
        currency: "KRW",
        units: [{ type: null, rent: 1300000, sizeM2: 23, note: "Very few listings", label: { size: "23 m²", rent: "₩1.3M", noteShort: "very few" } }]
      },
      {
        name: "Airbnb",
        currency: "USD",
        units: [{ type: null, rentMin: 1000, rentMax: null, sizeM2: null, label: { rent: "$1,000+" } }]
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
          { type: "Officetel", depositMin: 5000000, depositMax: null, rentMin: 450000, rentMax: 700000, sizeM2: null, label: { size: "—", deposit: "₩5M", rent: "₩450–700K" } },
          { type: "One-room", depositMin: 2000000, depositMax: 4000000, rentMin: 300000, rentMax: 500000, sizeM2: 29, label: { size: "29 m²", deposit: "₩2–4M", rent: "₩300–500K" } }
        ]
      },
      {
        name: "Enkostay",
        currency: "KRW",
        units: [{ type: null, rentMin: 1000000, rentMax: 1500000, sizeM2: null, label: { size: "—", rent: "₩1–1.5M" } }]
      },
      {
        name: "33m2",
        currency: "KRW",
        units: [{ type: null, rentMin: 1100000, rentMax: 1400000, sizeM2: null, label: { size: "—", rent: "₩1.1–1.4M" } }]
      },
      {
        name: "Airbnb",
        currency: "USD",
        units: [{ type: null, rentMin: 2000, rentMax: 4000, sizeM2: null, note: "Unusually wide/high range in the sampled listings — low confidence, worth re-checking.", label: { rent: "$2,000–4,000" } }]
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
          { type: "Officetel", depositMin: 5000000, depositMax: null, rent: 200000, sizeM2: 50, label: { size: "50 m²", deposit: "₩5M+", rent: "₩200K" } },
          { type: "One-room", depositMin: 3000000, depositMax: 5000000, rentMin: 250000, rentMax: 400000, sizeM2: 33, label: { size: "33 m²", deposit: "₩3–5M", rent: "₩250–400K" } }
        ]
      },
      {
        name: "Enkostay",
        currency: "KRW",
        units: [{ type: null, rentMin: 770000, rentMax: 1400000, sizeM2: null, label: { size: "—", rent: "₩770K–1.4M" } }]
      },
      {
        name: "33m2",
        currency: "KRW",
        units: [{ type: null, rent: 1000000, sizeM2: 26, label: { size: "26 m²", rent: "₩1M" } }]
      },
      {
        name: "Airbnb",
        currency: "USD",
        units: [{ type: null, rentMin: 500, rentMax: 750, sizeM2: null, label: { rent: "$500–750" } }]
      }
    ]
  }
];
