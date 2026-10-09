// Live Kakao Local keyword search, server-side only. Kakao's terms allow real-time calls only —
// no storage or caching of any kind — so nothing here is kept between requests. Never throws:
// any failure degrades to { degraded: true }.
import levels from "../../../src/_data/studyCafeLevels.json";

const API_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";
const PAGE_SIZE = 15;
const MAX_PAGES = 3; // Kakao only serves the first 45 results of any query
const TIMEOUT_MS = 8000;
const KEYWORD = "스터디카페";

export function levelFor(count) {
  let level = 0;
  levels.forEach((l, i) => {
    if (count >= l.min) level = i;
  });
  return { level, label: levels[level].label };
}

// Kakao's keyword search isn't region-filtered (results spill into neighbouring cities), so
// each city is filtered by address rules: every rule's token (0-based, space-split address_name)
// must be one of its values. Default is the city's own Korean name as the 2nd word ("경기 성남시
// …"); cities.json overrides it only where that doesn't hold (metros, Gwangju, Goseong). Gwangju merged into "전남광주통합특별시", so its only exact city handle is
// its five district names; one city-wide query plus those rules gave close to the same result as
// separate per-district queries (checked), so it isn't worth the extra calls.
function inCity(doc, rules) {
  const tokens = doc.address_name.split(/\s+/);
  return rules.every((r) => r.any.includes(tokens[r.token]));
}

async function searchPage(query, page, key) {
  const params = new URLSearchParams({ query, page: String(page), size: String(PAGE_SIZE) });
  const res = await fetch(`${API_URL}?${params}`, {
    headers: { Authorization: `KakaoAK ${key}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Kakao HTTP ${res.status}`);
  return res.json();
}

function addressRules(city) {
  return city.studyCafeSearch.address || [{ token: 1, any: [city.nameKo] }];
}

export async function countStudyCafes(city, env) {
  const key = env?.KAKAO_REST_API_KEY;
  const cfg = city.studyCafeSearch;
  if (!key) return { degraded: true, reason: "KAKAO_REST_API_KEY not set in this environment" };
  if (!cfg) return { degraded: true, reason: "no studyCafeSearch config for this city" };
  try {
    const matched = new Set();
    let retrieved = 0;
    let totalCount = 0;
    let capped = false;
    for (let page = 1; page <= MAX_PAGES; page++) {
      const data = await searchPage(`${cfg.place} ${KEYWORD}`, page, key);
      if (page === 1) {
        totalCount = data.meta.total_count;
        capped = data.meta.total_count > data.meta.pageable_count;
      }
      for (const d of data.documents) {
        retrieved += 1;
        if ((d.category_name.includes(KEYWORD) || d.place_name.includes(KEYWORD)) && inCity(d, addressRules(city))) {
          matched.add(d.id);
        }
      }
      if (data.meta.is_end) break;
    }
    // Under the 45-result cap the filtered count is exact. Past it, scale Kakao's total_count by
    // the share of the retrieved 45 that passed the filters.
    const count = capped && retrieved ? Math.round((matched.size / retrieved) * totalCount) : matched.size;
    return { count, estimated: capped, ...levelFor(count) };
  } catch (e) {
    // reason is a non-sensitive diagnostic (HTTP status or network error), never the key.
    // retryable: network/timeout/5xx only; 4xx (incl. 429 quota) won't recover within a retry.
    const status = /^Kakao HTTP (\d+)/.exec(e.message)?.[1];
    return { degraded: true, retryable: !status || Number(status) >= 500, reason: String(e.message || e) };
  }
}
