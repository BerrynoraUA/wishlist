import { Platform } from "react-native";

// --- Tier 1: fetch ---------------------------------------------------------

export const FETCH_TIMEOUT_MS = 8_000;
export const FETCH_MAX_BYTES = 5 * 1024 * 1024;

/** React Native's stack advertises okhttp / CFNetwork, which storefronts block. */
const FETCH_USER_AGENT = Platform.select({
  ios:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 " +
    "(KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1",
  android:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/126.0.6478.122 Mobile Safari/537.36",
  default:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/126.0.0.0 Safari/537.36",
})!;

export const FETCH_HEADERS: Record<string, string> = {
  "User-Agent": FETCH_USER_AGENT,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Upgrade-Insecure-Requests": "1",
};

// --- Parser sandbox --------------------------------------------------------

export const PARSER_HTML =
  '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>';
export const PARSER_READY_TIMEOUT_MS = 8_000;
export const PARSE_TIMEOUT_MS = 10_000;

/** HTML is injected as a JS string literal; keep it well under WebView limits. */
export const MAX_INJECTED_HTML = 2 * 1024 * 1024;

// --- Tier 2: browser render ------------------------------------------------

export const RENDER_TIMEOUT_MS = 20_000;
/** ~7s of polling, starting before content load so it spans hydration. */
export const RENDER_ATTEMPTS = 18;
export const RENDER_INTERVAL_MS = 400;
/** Longer than the retry budget, so the in-page loop always reports first. */
export const HTTP_ERROR_GRACE_MS = 8_000;

// --- Orchestration ---------------------------------------------------------

export const SANDBOX_WAIT_MS = 4_000;
