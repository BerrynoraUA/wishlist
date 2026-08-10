import {
  type ProductData,
  type QualityResult,
  classifyBlock,
  emptyProduct,
  hasAnyProductData,
  hasUsableProductData,
} from "@wishlist/scraper-core";
import { fetchHtml, isHttpUrl } from "./fetch-html";
import {
  type SandboxBridge,
  type SandboxParseResult,
  waitForSandboxBridge,
} from "./sandbox-bridge";

/**
 * Tier 1  plain fetch, parsed in the warm sandbox        (~300-800ms)
 * Tier 2  WebView loads the page, extract from live DOM  (~2-5s)
 *
 * The server tier lives in `api/scrape-product.ts`, so this module stays free
 * of network policy. Escalation mirrors `service.py::_needs_fallback`.
 */

export type ClientScrapeOutcome = {
  product: ProductData;
  quality: QualityResult;
  /** True when the result is good enough to skip the server fallback. */
  accepted: boolean;
};

const NO_RESULT: ClientScrapeOutcome = {
  product: emptyProduct(),
  quality: { score: 0, accepted: false, warnings: [] },
  accepted: false,
};

export async function scrapeProductOnDevice(url: string): Promise<ClientScrapeOutcome> {
  if (!isHttpUrl(url)) return NO_RESULT;

  const bridge = await waitForSandboxBridge();
  if (!bridge) return NO_RESULT;

  const http = await runHttpTier(bridge, url);
  let best = http.parsed;

  if (needsBrowserTier(http)) {
    const rendered = await runBrowserTier(bridge, url);
    if (rendered && browserWins(rendered, best)) best = rendered;
  }

  if (!best) return NO_RESULT;
  return { product: best.product, quality: best.quality, accepted: best.quality.accepted };
}

// --- Tiers -----------------------------------------------------------------

type HttpTierResult = {
  parsed: SandboxParseResult | null;
  blocked: boolean;
};

async function runHttpTier(bridge: SandboxBridge, url: string): Promise<HttpTierResult> {
  const fetched = await fetchHtml(url);
  if (fetched.error || !fetched.html) return { parsed: null, blocked: false };

  const parsed = await bridge.parseHtml(fetched.html, fetched.finalUrl).catch(() => null);
  return { parsed, blocked: classifyBlock(fetched.status, fetched.html).blocked };
}

function runBrowserTier(bridge: SandboxBridge, url: string): Promise<SandboxParseResult | null> {
  return bridge.renderAndScrape(url).catch(() => null);
}

// --- Decisions -------------------------------------------------------------

function needsBrowserTier(http: HttpTierResult): boolean {
  if (http.blocked || !http.parsed) return true;
  return !http.parsed.quality.accepted || !hasUsableProductData(http.parsed.product);
}

/**
 * The score decides, not the block flag: storefronts ship bot-wall markers on
 * perfectly good product pages, while a real challenge page scores near zero
 * because its title is in the blocked-title list.
 */
function browserWins(rendered: SandboxParseResult, best: SandboxParseResult | null): boolean {
  if (!best) return true;
  if (rendered.quality.score >= best.quality.score) return true;
  return !hasAnyProductData(best.product);
}
