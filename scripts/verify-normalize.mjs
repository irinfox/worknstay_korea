// Phase 21 verification — real live-captured raw samples (via kto-client.mjs, 2026-08-25)
// plus constructed edge cases for the quirks that don't show up in every sample. Run with:
//   node scripts/verify-normalize.mjs
import {
  normalizeAttraction,
  normalizeEvent,
  isUpcomingOrOngoing,
} from "../functions/api/lib/normalize.mjs";

let failures = 0;
function check(label, condition, detail) {
  const pass = Boolean(condition);
  console.log(`${pass ? "PASS" : "FAIL"} — ${label}${detail ? ` (${detail})` : ""}`);
  if (!pass) failures += 1;
}

// Real sample: areaBasedList2, Seoul, no image (firstimage/cpyrhtDivCd both "").
const rawNoImage = {
  addr1: "(12th Floor, Cheongho Building), 483 Gangnam-daero, Seocho-gu, Seoul",
  addr2: "",
  contentid: "3365278",
  firstimage: "",
  firstimage2: "",
  cpyrhtDivCd: "",
  mapx: "127.0236686375",
  mapy: "37.5053871607",
  modifiedtime: "20251023143000",
  title: "1stbutton Rhinoplasty clinic (첫단추의원)",
  lDongRegnCd: "11",
};
{
  const a = normalizeAttraction(rawNoImage);
  check("titleEn/titleKo split off trailing Korean paren only", a.titleEn === "1stbutton Rhinoplasty clinic" && a.titleKo === "첫단추의원", JSON.stringify(a.titleEn) + " / " + a.titleKo);
  check("unknown/empty cpyrhtDivCd -> imageLicense null, no image URLs rendered", a.imageLicense === null && a.imageUrl === "" && a.imageThumbUrl === "");
  check("modifiedtime parses to ISO+KST", a.sourceModifiedAt === "2025-10-23T14:30:00+09:00", a.sourceModifiedAt);
  check("lat/lng numeric", typeof a.lat === "number" && typeof a.lng === "number");
}

// Real sample: areaBasedList2, Seoul, Type3-licensed image.
const rawWithImage = {
  addr1: "7 Sinheung-ro 36-gil, Yongsan-gu, Seoul",
  addr2: "",
  contentid: "3544517",
  firstimage: "http://tong.visitkorea.or.kr/cms/resource/82/3523282_image2_1.jpg",
  firstimage2: "http://tong.visitkorea.or.kr/cms/resource/82/3523282_image3_1.jpg",
  cpyrhtDivCd: "Type3",
  mapx: "126.9821240366",
  mapy: "37.5464677550",
  modifiedtime: "20251023143000",
  title: "ARTEASPOON (아티스푼)",
  lDongRegnCd: "11",
};
{
  const a = normalizeAttraction(rawWithImage);
  check("known Type3 license kept, https rewrite applied", a.imageLicense === "Type3" && a.imageUrl.startsWith("https://"), a.imageUrl);
}

// Real sample: searchFestival2, Seoul.
const rawFestival = {
  addr1: "서울특별시 종로구 종로1길 45 (세종로)",
  addr2: "의정부지 역사유적광장(광화문)",
  contentid: "3379755",
  eventstartdate: "20261002",
  eventenddate: "20261004",
  firstimage: "",
  cpyrhtDivCd: "",
  title: "Bongsan Mask Dance(봉산탈춤 다 모여라~ )",
  lDongRegnCd: "11",
};
{
  const e = normalizeEvent(rawFestival);
  check("event date fields formatted YYYY-MM-DD", e.startDate === "2026-10-02" && e.endDate === "2026-10-04");
  check("title with no space before paren still splits correctly", e.titleEn === "Bongsan Mask Dance", JSON.stringify(e.titleEn));
}

// Real sample: searchFestival2, Gyeonggi-do — a title whose Korean group has *nested* parens.
{
  const e = normalizeEvent({
    title: "APAP Artwork Tour (APAP 작품투어 (안양공공예술프로젝트))",
    addr1: "경기도 안성시 보개면 남사당로 198-2 Anseong Namsadang Performance Site",
    eventstartdate: "20260310",
    eventenddate: "20261130",
    cpyrhtDivCd: "",
    lDongRegnCd: "41",
  });
  check(
    "nested-paren Korean title still yields a clean titleEn",
    e.titleEn === "APAP Artwork Tour" && e.titleKo === "APAP 작품투어 (안양공공예술프로젝트)",
    JSON.stringify(e.titleEn) + " / " + e.titleKo
  );
}

// "(English) (Korean)" — the English parenthetical sub-title is dropped from titleEn too, same
// as the Korean group's own nested parens — titleKo never carries one, so keeping it only in
// titleEn read as redundant (e.g. "Mudeungsan National Park (Gwangju)" duplicating the city).
check(
  "two-group title drops the English parenthetical sub-title from titleEn",
  normalizeEvent({ title: "5.16 Tree Tunnel (Road 5.16 Forest Tunnel) (5.16도로숲터널)" }).titleEn ===
    "5.16 Tree Tunnel"
);

// Edge case: event that started before "today" but hasn't ended — the eventStartDate query
// quirk this function exists to guard against.
check(
  "isUpcomingOrOngoing keeps a festival that started in the past but ends in the future",
  isUpcomingOrOngoing({ eventenddate: "20261231" }, new Date("2026-08-25")) === true
);
check(
  "isUpcomingOrOngoing drops a festival that already ended",
  isUpcomingOrOngoing({ eventenddate: "20260101" }, new Date("2026-08-25")) === false
);
check(
  "isUpcomingOrOngoing keeps records with no end date (unknown, don't drop)",
  isUpcomingOrOngoing({}, new Date("2026-08-25")) === true
);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
