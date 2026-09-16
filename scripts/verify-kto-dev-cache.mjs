// Phase 25 verification — stubs globalThis.fetch with a call-counting fake, no live KTO calls
// needed. Run with:
//   node scripts/verify-kto-dev-cache.mjs
import { fetchKto } from "../functions/api/lib/kto-client.mjs";

let failures = 0;
function check(label, condition, detail) {
  const pass = Boolean(condition);
  console.log(`${pass ? "PASS" : "FAIL"} — ${label}${detail ? ` (${detail})` : ""}`);
  if (!pass) failures += 1;
}

function stubFetch() {
  let calls = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(
      JSON.stringify({
        response: {
          header: { resultCode: "0000" },
          body: { items: { item: [{ contentid: "1", title: "Stub" }] }, totalCount: 1 },
        },
      }),
      { status: 200 }
    );
  };
  return { getCalls: () => calls, restore: () => (globalThis.fetch = realFetch) };
}

// Two identical calls with KTO_DEV_CACHE=1 hit the fake fetch only once.
{
  const stub = stubFetch();
  const env = { KTO_API_KEY: "test-key", KTO_DEV_CACHE: "1" };
  const params = { contentTypeId: 76, lDongRegnCd: "11", numOfRows: 5, pageNo: 1 };

  const first = await fetchKto("areaBasedList2", params, env);
  const second = await fetchKto("areaBasedList2", params, env);
  check("dev cache hit: identical calls hit fetch once", stub.getCalls() === 1, `fetch calls=${stub.getCalls()}`);
  check("cached response matches the original", JSON.stringify(first) === JSON.stringify(second));
  stub.restore();
}

// Without KTO_DEV_CACHE, identical calls hit fetch every time (no accidental caching).
{
  const stub = stubFetch();
  const env = { KTO_API_KEY: "test-key" };
  const params = { contentTypeId: 76, lDongRegnCd: "11", numOfRows: 5, pageNo: 1 };

  await fetchKto("areaBasedList2", params, env);
  await fetchKto("areaBasedList2", params, env);
  check("no KTO_DEV_CACHE: identical calls hit fetch every time", stub.getCalls() === 2, `fetch calls=${stub.getCalls()}`);
  stub.restore();
}

// A different params object (different URL) is a cache miss even with KTO_DEV_CACHE=1. Uses
// lDongRegnCd values not touched by the earlier blocks — the dev cache is module-level and
// persists for the process lifetime, same as it would in a real `pages:dev` session.
{
  const stub = stubFetch();
  const env = { KTO_API_KEY: "test-key", KTO_DEV_CACHE: "1" };

  await fetchKto("areaBasedList2", { contentTypeId: 76, lDongRegnCd: "26", numOfRows: 5, pageNo: 1 }, env);
  await fetchKto("areaBasedList2", { contentTypeId: 76, lDongRegnCd: "27", numOfRows: 5, pageNo: 1 }, env);
  check("different request URL is a cache miss", stub.getCalls() === 2, `fetch calls=${stub.getCalls()}`);
  stub.restore();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
