/** Port of `services/scraper/app/blocking.py`. */
import type { BlockDecision } from "./types";

const BLOCKED_STATUSES = new Set([401, 403, 407, 429, 444, 503]);

const CHALLENGE_MARKERS = [
  "cf-chl-",
  "cloudflare ray id",
  "checking your browser",
  "just a moment",
  "challenge-platform",
];
const ACCESS_DENIED_MARKERS = [
  "<title>access denied",
  "<title>forbidden",
  "request blocked",
  "automated access is prohibited",
];
const CAPTCHA_MARKERS = ["g-recaptcha", "hcaptcha", "captcha-container", "verify you are human"];
const SOFT_BLOCK_MARKERS = [
  "<title>error page | ebay",
  "<title>javascript is disabled",
  "<title>register &amp; sign in - farfetch",
  "<title>register & sign in - farfetch",
  "<title>sign in | farfetch",
  "<title>page load problem",
  "please enable javascript to continue",
  "javascript is required to view this page",
  "enable javascript and cookies to continue",
];

export function classifyBlock(status: number, body: string): BlockDecision {
  const normalized = body.slice(0, 500_000).toLowerCase();
  if (!normalized.trim()) return { blocked: true, reason: "empty_response" };
  if (CHALLENGE_MARKERS.some((marker) => normalized.includes(marker))) {
    return { blocked: true, reason: "challenge" };
  }
  if (ACCESS_DENIED_MARKERS.some((marker) => normalized.includes(marker))) {
    return { blocked: true, reason: "access_denied" };
  }
  const hasProductMeta =
    (normalized.includes('property="og:title"') || normalized.includes("property='og:title'")) &&
    (normalized.includes('property="og:image"') || normalized.includes("property='og:image'"));
  if (!hasProductMeta && CAPTCHA_MARKERS.some((marker) => normalized.includes(marker))) {
    return { blocked: true, reason: "captcha" };
  }
  if (SOFT_BLOCK_MARKERS.some((marker) => normalized.includes(marker))) {
    return { blocked: true, reason: "soft_block" };
  }
  if (BLOCKED_STATUSES.has(status)) return { blocked: true, reason: "http_status" };
  return { blocked: false, reason: null };
}
