import { EXTRACTOR_JS } from "./extractor-bundle.generated";
import { MAX_INJECTED_HTML, RENDER_ATTEMPTS, RENDER_INTERVAL_MS } from "./constants";
import type { SandboxParseResult } from "./sandbox-bridge";

/** Wire format of the messages the injected extractor posts back. */
export type BridgeMessage = {
  type?: "scrape-result" | "scrape-error" | "scrape-ready";
  id?: string;
  product?: SandboxParseResult["product"];
  quality?: SandboxParseResult["quality"];
  error?: string;
};

let sequence = 0;

export function nextRequestId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence}`;
}

export function parseBridgeMessage(raw: string): BridgeMessage | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as BridgeMessage;
  } catch {
    return null;
  }
}

/** `JSON.stringify` leaves U+2028/2029 raw, and they terminate a JS literal. */
function toJsLiteral(value: unknown): string {
  return JSON.stringify(value)
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function buildBundleScript(): string {
  return `${EXTRACTOR_JS};true;`;
}

export function buildParseScript(id: string, url: string, html: string): string {
  const payload = toJsLiteral({
    id,
    url,
    html: html.length > MAX_INJECTED_HTML ? html.slice(0, MAX_INJECTED_HTML) : html,
  });
  return `window.__wishlistParse(${payload});true;`;
}

export function buildAutoScrapeScript(id: string): string {
  const payload = toJsLiteral({
    id,
    attempts: RENDER_ATTEMPTS,
    intervalMs: RENDER_INTERVAL_MS,
  });
  return `${EXTRACTOR_JS};window.__wishlistAutoScrape(${payload});true;`;
}
