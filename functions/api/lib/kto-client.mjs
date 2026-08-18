// Stub only (Phase 8 scaffolding) — the mock endpoints in functions/api/region/[slug]/ don't
// call this yet. Real KTO request building (EngService2 areaBasedList2/searchFestival2/
// detailImage2 URL construction, paging, 429 backoff/retry) is a separate, compliance-driven
// follow-up phase, not part of scaffolding — see architecture.md §5.
export async function fetchKto(endpoint, params) {
  throw new Error(
    `kto-client.mjs is a Phase 8 stub — live KTO calls (endpoint: ${endpoint}) aren't implemented yet.`
  );
}
