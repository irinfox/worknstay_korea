-- Tracking storage (docs/TRACKING_PLAN.md): one row per event, event-specific fields as JSON.
CREATE TABLE events (
  event_id        TEXT PRIMARY KEY,
  ts_utc          TEXT NOT NULL,
  event_name      TEXT NOT NULL,
  schema_version  INTEGER NOT NULL,
  env             TEXT NOT NULL,
  page_path       TEXT,
  page_type       TEXT,
  prev_page_type  TEXT,
  page_load_id    TEXT,
  device_category TEXT,
  viewport_bucket TEXT,
  country         TEXT,
  browser_lang    TEXT,
  is_likely_bot   INTEGER DEFAULT 0,
  params          TEXT
);
CREATE INDEX idx_events_name_ts ON events(event_name, ts_utc);
CREATE INDEX idx_events_page_load ON events(page_load_id);

CREATE TABLE gni_reference (
  application_year INTEGER PRIMARY KEY,
  gni_year         INTEGER NOT NULL,
  gni_krw          INTEGER NOT NULL,
  source_url       TEXT,
  valid_from       TEXT
);

-- Reference value behind the income buckets (events.gni_year joins gni_year); mirrors visaRules.json.
INSERT INTO gni_reference (application_year, gni_year, gni_krw, source_url, valid_from)
VALUES (2026, 2025, 52410000, 'https://www.moj.go.kr/bbs/immigration/214/608294/artclView.do', '2026-06-30');
