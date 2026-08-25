// Phase 21 verification — real live-captured raw samples (via kto-client.mjs, 2026-08-25)
// plus constructed edge cases for the quirks that don't show up in every sample. Run with:
//   node scripts/verify-normalize.mjs
import {
  normalizeAttraction,
  normalizeEvent,
  normalizeGalleryImage,
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

// Real sample: detailImage2, Korean-only imgname.
const rawGalleryImage = {
  contentid: "3544517",
  originimgurl: "http://tong.visitkorea.or.kr/cms/resource/83/3523283_image2_1.jpg",
  imgname: "용산구_아티스푼(ARTEASPOON) (2)",
  smallimageurl: "http://tong.visitkorea.or.kr/cms/resource/83/3523283_image3_1.jpg",
  cpyrhtDivCd: "Type3",
};
{
  const g = normalizeGalleryImage(rawGalleryImage, "ARTEASPOON");
  check("Korean-dominant imgname falls back to attraction's English title", g.caption === "ARTEASPOON", g.caption);
  check("gallery image https rewrite applied", g.imageUrl.startsWith("https://"));
}

// Constructed edge case: imgname that's plain English (rare, but shouldn't be discarded).
{
  const g = normalizeGalleryImage({ ...rawGalleryImage, imgname: "Front entrance" }, "ARTEASPOON");
  check("non-Korean imgname is kept as-is, not overridden by fallback", g.caption === "Front entrance", g.caption);
}

// Unlicensed gallery image is dropped entirely, not rendered without attribution context.
check(
  "gallery image with empty cpyrhtDivCd returns null (dropped)",
  normalizeGalleryImage({ ...rawGalleryImage, cpyrhtDivCd: "" }, "ARTEASPOON") === null
);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
