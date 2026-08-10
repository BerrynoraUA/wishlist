import type { ProductData, QualityResult } from "@wishlist/scraper-core";
import { SANDBOX_WAIT_MS } from "./constants";

/**
 * Module-level handle to the WebViews rendered by
 * `components/scraper/scraper-sandbox.tsx`. Kept outside React so plain
 * functions can reach the sandbox without threading a context through.
 */

export type SandboxParseResult = {
  product: ProductData;
  quality: QualityResult;
};

export type SandboxBridge = {
  /** Tier 1: parse HTML we already fetched, inside the warm sandbox. */
  parseHtml: (html: string, url: string) => Promise<SandboxParseResult>;
  /** Tier 2: let a WebView load the URL itself, then extract from the live DOM. */
  renderAndScrape: (url: string) => Promise<SandboxParseResult>;
};

let bridge: SandboxBridge | null = null;
let waiters: ((value: SandboxBridge) => void)[] = [];

export function registerSandboxBridge(next: SandboxBridge | null): void {
  bridge = next;
  if (!next) return;
  const pending = waiters;
  waiters = [];
  for (const resolve of pending) resolve(next);
}

/** Resolves once the sandbox mounts, or `null` if it never does in time. */
export function waitForSandboxBridge(): Promise<SandboxBridge | null> {
  if (bridge) return Promise.resolve(bridge);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: SandboxBridge | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    waiters.push(finish);
    setTimeout(() => finish(null), SANDBOX_WAIT_MS);
  });
}
