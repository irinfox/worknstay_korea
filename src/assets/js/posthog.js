// PostHog (docs/TRACKING_PLAN.md): session replay + heatmaps + autocapture, memory-only. Nothing is
// written to the device and no person is identified, so an id lives only for one page view. D1
// stays the source for named events. Every path fails silently; an empty key disables it.
const CONFIG_ID = "posthog-config";

function loadScript(src, onLoad) {
  const s = document.createElement("script");
  s.src = src;
  s.async = true;
  s.crossOrigin = "anonymous";
  s.onload = onLoad;
  document.head.appendChild(s);
}

// Same labels and rule as envName() in functions/api/lib/tracking.mjs, so both systems filter alike.
function envName() {
  const host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return "local";
  if (host.endsWith(".pages.dev") && host.split(".").length > 3) return "preview";
  return "production";
}

function start(cfg) {
  const key = cfg.key;
  if (!key) return;
  // Opt-out signals are honoured even though nothing identifies the visitor.
  if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl) return;

  // Same queue-then-replace handshake as PostHog's own snippet: array.js drains `_i` on load.
  const stub = [];
  stub.__SV = 1;
  stub._i = [];
  stub.init = (k, c, name) => stub._i.push([k, c, name]);
  window.posthog = stub;

  window.posthog.init(key, {
    api_host: cfg.apiHost,
    defaults: "2026-08-30",
    strict_script_versioning: true,
    persistence: "memory",
    person_profiles: "identified_only",
    ip: false,
    autocapture: { dom_event_allowlist: ["click"] },
    enable_heatmaps: true,
    capture_pageview: true,
    capture_pageleave: true,
    disable_surveys: true,
    before_send: (event) => {
      if (event) {
        event.properties = { ...event.properties, env: envName() };
        // Only the parsed browser / OS fields are kept, never the raw User-Agent string.
        delete event.properties.$raw_user_agent;
      }
      return event;
    },
    session_recording: {
      maskAllInputs: true,
      blockSelector: ".ph-no-capture",
    },
  });
  loadScript(`${cfg.apiHost.replace(".i.posthog.com", "-assets.i.posthog.com")}/static/${cfg.sdkVersion}/array.js`);
}

export function init() {
  try {
    const raw = document.getElementById(CONFIG_ID)?.textContent;
    if (!raw) return;
    const cfg = JSON.parse(raw);
    // After load and idle, so the third-party script never competes with first paint.
    const go = () => ("requestIdleCallback" in window ? requestIdleCallback(() => start(cfg), { timeout: 4000 }) : setTimeout(() => start(cfg), 2000));
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
  } catch {
    // tracking must never affect the page
  }
}
