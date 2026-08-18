// Stub only (Phase 8 scaffolding) — the mock endpoints already return data pre-shaped to match
// the Attraction/Event/Gallery models (architecture.md §6), so these are pass-throughs for now.
// Real normalization (title split, http->https rewrite, HTML-entity strip, license filtering,
// lDongRegnCd -> region slug) is a separate, compliance-driven follow-up phase — see
// architecture.md §5's "Known KTO data quirks" list.
export function normalizeAttraction(raw) {
  return raw;
}

export function normalizeEvent(raw) {
  return raw;
}

export function normalizeGalleryImage(raw) {
  return raw;
}
