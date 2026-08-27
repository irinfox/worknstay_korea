// Raw KTO EngService2 item -> our Attraction/Event models (architecture.md §6). Encodes the
// "known quirks" list in architecture.md §5, confirmed against live-captured samples: bilingual
// title split, HTML-entity strip, http->https, license gating (never render an image with a
// missing/unknown cpyrhtDivCd, never crop/filter a Type3 asset), and the
// eventStartDate/eventenddate "still running" filter.
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

// Titles arrive like "ARTEASPOON (아티스푼)", "1stbutton Rhinoplasty clinic (첫단추의원)", or
// with a nested-paren Korean group like "APAP Artwork Tour (APAP 작품투어 (안양공공예술프로젝트))".
// titleEn is everything before the trailing Korean-script parenthesized group; that group is
// titleKo. Titles with no trailing Korean paren keep titleKo empty rather than guessing.
function splitTitle(rawTitle) {
  const title = decodeEntities(rawTitle);
  // Preferred: trailing "(...)" with no nested parens — keeps a parenthetical English
  // sub-title (e.g. "... (Road 5.16 Forest Tunnel) (5.16도로숲터널)") inside titleEn.
  let match = title.match(/^(.*)\(([^()]*[가-힣][^()]*)\)\s*$/);
  // Fallback: the Korean group itself contains parens.
  if (!match) match = title.match(/^(.*?)\s*\((.*[가-힣].*)\)\s*$/);
  if (!match) return { titleEn: title, titleKo: "" };
  return { titleEn: match[1].trim(), titleKo: match[2].trim() };
}

// Missing/unknown cpyrhtDivCd means "don't render this image," not "assume it's free to use"
// (architecture.md §5).
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
    titleEn,
    titleKo,
    summary: "",
    address: [raw.addr1, raw.addr2].filter(Boolean).join(" ").trim(),
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
    address: [raw.addr1, raw.addr2].filter(Boolean).join(" ").trim(),
    imageUrl: imageLicense ? toHttps(raw.firstimage) : "",
    imageLicense,
    tel: raw.tel || "",
    homepageUrl: "",
  };
}

// searchFestival2's `eventStartDate` param only filters by *start* — a festival that started
// before the query's start-date bound but hasn't ended yet would vanish unless the caller
// queries from further back and filters by end date itself (architecture.md §5). This is that
// filter: apply it to results from a deliberately-early query.
export function isUpcomingOrOngoing(raw, referenceDate = new Date()) {
  const end = raw.eventenddate;
  if (!end || end.length !== 8) return true;
  const endOfDay = new Date(`${end.slice(0, 4)}-${end.slice(4, 6)}-${end.slice(6, 8)}T23:59:59+09:00`);
  return endOfDay >= referenceDate;
}
