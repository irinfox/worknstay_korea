// Raw KTO EngService2 item -> our Attraction/Event models: bilingual title split,
// HTML-entity strip, http->https, license gating (never render an image with a missing/unknown
// cpyrhtDivCd, never crop/filter a Type3 asset).
//
// `regionSlug` is deliberately NOT set here — these functions normalize one raw item in
// isolation, but which region it belongs to is a fan-out concern (which lDongRegnCd code the
// caller queried), owned by the endpoint wiring, not this module.
//
// No source field on areaBasedList2/searchFestival2 for Attraction.summary / Event.homepageUrl
// (would need detailCommon2/detailIntro2). Left as "" below, not fabricated.

const KNOWN_LICENSES = new Set(["Type1", "Type3"]);

function toHttps(url) {
  return url ? url.replace(/^http:\/\//, "https://") : "";
}

function decodeEntities(text) {
  return (text || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// Titles arrive like "ARTEASPOON (아티스푼)", "1stbutton Rhinoplasty clinic (첫단추의원)",
// with a nested-paren Korean group like "APAP Artwork Tour (APAP 작품투어 (안양공공예술프로젝트))",
// with a "[...]" tag on either side like "Geomunoreum Lava Tube [UNESCO World Natural Heritage
// Site] (거문오름 [유네스코 세계자연유산])", or with an extra English parenthetical sub-title ahead of
// the Korean group like "Seoraksan National Park (Southern Section) (설악산국립공원 (남설악))" or
// "Mudeungsan National Park (Gwangju) (무등산국립공원(광주))" — all stripped below, readability call,
// not KTO data we want to keep. titleEn is everything before the FIRST "(" once a trailing
// Korean-script group is found — deliberately dropping an English sub-title too (not just the
// Korean group's own nested parens), since titleKo never carries one either and keeping it in
// titleEn only reads as redundant ("Southern Section", "(Gwangju)" duplicating the city).
// Titles with no trailing Korean paren are left untouched and keep titleKo empty rather than
// guessing.
// Dropping a nested group from titleKo was weighed against CLAUDE.md's keep-Korean-names
// requirement (users search by Korean name) and kept: the main Korean name stays searchable.
function stripBracketedTags(text) {
  return text
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function splitTitle(rawTitle) {
  const title = stripBracketedTags(decodeEntities(rawTitle));
  // Trailing "(...)" group, allowing one level of nesting inside it (the Korean group can carry
  // its own alt/older name in a further "(...)", e.g. the APAP/남설악/명상관 cases above).
  const koreanTail = title.match(/\((?:[^()]|\([^()]*\))*\)\s*$/);
  if (!koreanTail || !/[가-힣]/.test(koreanTail[0])) return { titleEn: title, titleKo: "" };
  const titleEn = title.slice(0, title.indexOf("(")).trim();
  // Drop a nested "(...)" inside titleKo itself too (the APAP/Hamdeok Beach case above).
  const titleKo = koreanTail[0].slice(1, -1).trim().replace(/\s*\([^()]*\)/g, "").trim();
  return { titleEn, titleKo };
}

// Missing/unknown cpyrhtDivCd means "don't render this image," not "assume it's free to use".
function licenseOf(raw) {
  return KNOWN_LICENSES.has(raw) ? raw : null;
}

function parseKtoDateTime(raw) {
  if (!raw || raw.length !== 14) return null;
  const y = raw.slice(0, 4), mo = raw.slice(4, 6), d = raw.slice(6, 8);
  const h = raw.slice(8, 10), mi = raw.slice(10, 12), s = raw.slice(12, 14);
  return `${y}-${mo}-${d}T${h}:${mi}:${s}+09:00`;
}

function formatKtoDate(raw) {
  if (!raw || raw.length !== 8) return null;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

export function normalizeAttraction(raw) {
  const { titleEn, titleKo } = splitTitle(raw.title);
  const imageLicense = licenseOf(raw.cpyrhtDivCd);
  return {
    contentId: raw.contentid,
    lDongRegnCd: raw.lDongRegnCd,
    lDongSignguCd: raw.lDongSignguCd || "",
    titleEn,
    titleKo,
    summary: "",
    // KTO occasionally sends addr2 as the literal string "0" instead of leaving it empty
    // (confirmed live on contentId 264550, N Seoul Tower) — filtered out alongside blanks.
    address: [raw.addr1, raw.addr2].filter((part) => part && part !== "0").join(" ").trim(),
    imageUrl: imageLicense ? toHttps(raw.firstimage) : "",
    imageThumbUrl: imageLicense ? toHttps(raw.firstimage2) : "",
    imageLicense,
    lat: raw.mapy ? Number(raw.mapy) : null,
    lng: raw.mapx ? Number(raw.mapx) : null,
    sourceModifiedAt: parseKtoDateTime(raw.modifiedtime),
  };
}

export function normalizeEvent(raw) {
  const { titleEn, titleKo } = splitTitle(raw.title);
  const imageLicense = licenseOf(raw.cpyrhtDivCd);
  return {
    contentId: raw.contentid,
    lDongRegnCd: raw.lDongRegnCd,
    titleEn,
    titleKo,
    startDate: formatKtoDate(raw.eventstartdate),
    endDate: formatKtoDate(raw.eventenddate),
    // KTO occasionally sends addr2 as the literal string "0" instead of leaving it empty
    // (confirmed live on contentId 264550, N Seoul Tower) — filtered out alongside blanks.
    address: [raw.addr1, raw.addr2].filter((part) => part && part !== "0").join(" ").trim(),
    imageUrl: imageLicense ? toHttps(raw.firstimage) : "",
    imageLicense,
    tel: raw.tel || "",
    homepageUrl: "",
  };
}
