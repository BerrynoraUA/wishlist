/**
 * Compiled into the string injected into the scraping WebViews.
 *
 *  - `__wishlistParse` — tier 1: RN fetched the HTML and hands it over for
 *    parsing inside a warm `about:blank` sandbox.
 *  - `__wishlistAutoScrape` — tier 2: the WebView navigated to the target
 *    itself, so parse the live document and retry while the page hydrates.
 */
import { parseHtml } from "./dom";
import { parseProductDocument } from "./parsing";
import type { ProductData, QualityResult } from "./types";

type ParseRequest = { id: string; html: string; url: string };
type AutoScrapeRequest = { id: string; attempts?: number; intervalMs?: number };

type BridgeMessage = {
  type: "scrape-result" | "scrape-error" | "scrape-ready";
  id: string;
  product?: ProductData;
  quality?: QualityResult;
  error?: string;
};

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (message: string) => void };
    __wishlistParse?: (request: ParseRequest) => void;
    __wishlistAutoScrape?: (request: AutoScrapeRequest) => void;
    __wishlistAutoScrapeStarted?: boolean;
  }
}

function post(message: BridgeMessage): void {
  window.ReactNativeWebView?.postMessage(JSON.stringify(message));
}

/** Posts the result, unless it is still poor and a retry is coming. */
function parseAndPost(input: {
  id: string;
  document: Document;
  html: string;
  url: string;
  isFinalAttempt: boolean;
}): boolean {
  const { extraction, quality } = parseProductDocument(input.document, input.html, input.url);
  if (!quality.accepted && !input.isFinalAttempt) return false;
  post({ type: "scrape-result", id: input.id, product: extraction.product, quality });
  return true;
}

function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

window.__wishlistParse = (request) => {
  try {
    parseAndPost({
      id: request.id,
      document: parseHtml(request.html),
      html: request.html,
      url: request.url,
      isFinalAttempt: true,
    });
  } catch (error) {
    post({ type: "scrape-error", id: request.id, error: describeError(error) });
  }
};

window.__wishlistAutoScrape = (request) => {
  // Injected both before content load and at load end so pages that never
  // finish loading still get scraped; only the first call runs.
  if (window.__wishlistAutoScrapeStarted) return;
  window.__wishlistAutoScrapeStarted = true;

  const totalAttempts = request.attempts ?? 8;
  const intervalMs = request.intervalMs ?? 400;
  let attempt = 0;

  const tick = () => {
    attempt += 1;
    const isFinalAttempt = attempt >= totalAttempts;
    try {
      const posted = parseAndPost({
        id: request.id,
        document,
        html: document.documentElement?.outerHTML ?? "",
        url: window.location.href,
        isFinalAttempt,
      });
      if (posted) return;
    } catch (error) {
      if (isFinalAttempt) {
        post({ type: "scrape-error", id: request.id, error: describeError(error) });
        return;
      }
    }
    window.setTimeout(tick, intervalMs);
  };

  window.setTimeout(tick, 0);
};

post({ type: "scrape-ready", id: "boot" });

export {};
