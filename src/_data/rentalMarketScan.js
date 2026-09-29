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
// `regionSummary` rolls this research up to region level: homepage cards, region-page
// rent-summary card, cost table/note. `costRows` omits rows with no checked figure (no Seoul
// comparison for Jeolla/Gyeongsang). Only Gangwon-do's scan included a deposit-charging
// platform, so elsewhere deposit is a flat "none". Gyeonggi-do's rows break down by city instead.
export default {
  regionSummary: [
    {
      regionSlug: "gyeonggi-do",
      furnishedShortTermMonthly: "₩1.4–2M+",
      source: "Hand-checked from current furnished short-term listings, September 2026",
      costRows: [
        { label: "Seoul", tiers: [
            { size: "12–21 m²", value: "₩1–1.4M" },
            { size: "~25 m²", value: "₩1.7M+" }
          ] },
        { label: "Incheon, Songdo", tiers: [{ size: "23–29 m²", value: "₩1.5–1.7M" }] },
        { label: "Suwon", tiers: [{ size: "20–26 m²", value: "₩1.4–1.7M" }] },
        { label: "Seongnam, Bundang", tiers: [{ size: "24–40 m²", value: "₩1.8–2M" }] },
        { label: "Upfront deposit", tiers: [{ value: "none" }] }
      ],
      costCaption: "The prices shown are for decent furnished stays available to foreigners, without a large upfront deposit or long-term contract.",
      costNote: [
        "In this region, rental costs highly depend on the specific district and the level of comfort you expect (e.g., a wet room vs. an enclosed shower). Incheon's Songdo area offers very standardized floor plans with a stable price range. Seongnam's Bundang has a high price floor with almost no budget options. Across all cities, cheaper stays can be found in other districts, though usually with smaller floor space and older facilities.",
        "In Seoul, the price also heavily depends on the district."
      ]
    },
    {
      regionSlug: "gangwon-do",
      furnishedShortTermMonthly: "₩1–1.4M",
      source: "Hand-checked from current furnished short-term listings, September 2026",
      costRows: [
        { label: "Short-term stay, per month", value: "₩1–1.4M" },
        { label: "Typical size", value: "23–30 m² and up" },
        { label: "Same money in Seoul", value: "12–21 m²" },
        { label: "Upfront deposit", value: "none or ₩330K" }
      ],
      costCaption: "The prices shown are for decent furnished stays available to foreigners, without a large upfront deposit or long-term contract.",
      costNote: [
        "Stays in this region generally offer more space for the money than in Seoul. Sokcho has the widest range of flexible options, while Wonju is the cheapest overall. Gangneung is more local-oriented, with more options on the 33m2 platform."
      ]
    },
    {
      regionSlug: "chungcheong-do",
      furnishedShortTermMonthly: "₩1–1.4M",
      source: "Hand-checked from current furnished short-term listings, September 2026",
      costRows: [
        { label: "Short-term stay, per month", value: "₩1–1.4M" },
        { label: "Typical size", value: "20–40 m²" },
        { label: "Same money in Seoul", value: "12–21 m²" },
        { label: "Upfront deposit", value: "none" }
      ],
      costCaption: "The prices shown are for decent furnished stays available to foreigners, without a large upfront deposit or long-term contract.",
      costNote: [
        "In this region, Daejeon has the highest number of listings across foreigner-friendly platforms. Cheongju has fewer options on these platforms, while Sejong's short-term rentals are mostly limited to the local-oriented 33m2 platform."
      ]
    },
    {
      regionSlug: "gyeongsang-do",
      furnishedShortTermMonthly: "₩1.1–1.5M",
      source: "Hand-checked from current furnished short-term listings, September 2026",
      costRows: [
        { label: "Short-term stay, per month", value: "₩1.1–1.5M" },
        { label: "Typical size", value: "24–33 m²" },
        { label: "Upfront deposit", value: "none" }
      ],
      costCaption: "The prices shown are for decent furnished stays available to foreigners, without a large upfront deposit or long-term contract.",
      costNote: [
        "In this region, both Busan and Daegu have a good number of listings across foreigner-friendly platforms. Ulsan is more local-oriented, with more options on the 33m2 platform, and Gyeongju month-long stay options tend to be more family-oriented with larger floor space and higher rents."
      ]
    },
    {
      regionSlug: "jeolla-do",
      furnishedShortTermMonthly: "₩800K–1.2M",
      source: "Hand-checked from current furnished short-term listings, September 2026",
      costRows: [
        { label: "Short-term stay, per month", value: "₩800K–1.2M" },
        { label: "Typical size", value: "20–40 m²" },
        { label: "Upfront deposit", value: "none" }
      ],
      costCaption: "The prices shown are for decent furnished stays available to foreigners, without a large upfront deposit or long-term contract.",
      costNote: [
        "The majority of listings lack a dedicated computer desk. Overall, options are quite limited across the region with somewhat better coverage in Jeonju and Yeosu. Suncheon shows decent budget stays mainly on the local-oriented 33m2 platform, while Gwangju is the most local-oriented of them all — the majority of short-term stays are 2–3 room apartments with ~₩1.8M rent."
      ]
    },
    {
      regionSlug: "jeju-do",
      furnishedShortTermMonthly: "₩1.1–1.6M",
      source: "Hand-checked from current furnished short-term listings, September 2026",
      costRows: [
        { label: "Short-term stay, per month", value: "₩1.1–1.6M" },
        { label: "Typical size", value: "23–30 m² and up" },
        { label: "Upfront deposit", value: "none" }
      ],
      costCaption: "The prices shown are for decent furnished stays available to foreigners, without a large upfront deposit or long-term contract.",
      costNote: [
        "Depending on the platform, Jeju City has a larger number of listings, while Seogwipo tends to offer more spacious options. Since Jeju is a highly popular destination for both locals and foreigners, Airbnb coverage across the island is broad, with monthly discounts that can bring prices even below the indicated range."
      ]
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
          currency: "KRW",
          units: [{ type: null, sizeM2: null, label: { rent: "~₩1.4M" } }]
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
          units: [{ type: null, sizeM2: 26, label: { size: "26 m²", rent: "₩1.1–1.4M" } }]
        },
        {
          name: "Airbnb",
          currency: "KRW",
          units: [{ type: null, sizeM2: null, label: { rent: "₩1.4M+" } }]
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
          currency: "KRW",
          units: [{ type: null, sizeM2: null, note: "Unusually wide/high range in the sampled listings — low confidence, worth re-checking.", label: { rent: "₩2.7–5.4M" } }]
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
          currency: "KRW",
          units: [{ type: null, sizeM2: null, label: { rent: "₩680K–1M" } }]
        }
      ]
    }
  ]
};
