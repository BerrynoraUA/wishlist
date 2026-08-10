import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Exercises the committed bundle exactly the way the WebViews do: evaluate the
 * injected string, then call the bridge entry point and read the posted
 * message. Catches a stale bundle and any browser-only breakage in the entry.
 */

const bundlePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../apps/native/lib/scraper/extractor-bundle.generated.ts",
);

function loadBundleSource(): string {
  const file = readFileSync(bundlePath, "utf8");
  const match = /export const EXTRACTOR_JS = ("(?:[^"\\]|\\[\s\S])*");/.exec(file);
  if (!match) throw new Error("EXTRACTOR_JS not found in the generated bundle");
  return JSON.parse(match[1]) as string;
}

type Posted = {
  type: string;
  id: string;
  product?: { title: string | null; price: string | null };
};

describe("generated extractor bundle", () => {
  const messages: Posted[] = [];

  beforeAll(() => {
    (window as unknown as { ReactNativeWebView: unknown }).ReactNativeWebView = {
      postMessage: (raw: string) => {
        messages.push(JSON.parse(raw) as Posted);
      },
    };
    // eslint-disable-next-line no-eval
    (0, eval)(loadBundleSource());
  });

  it("announces itself once evaluated", () => {
    expect(messages.some((message) => message.type === "scrape-ready")).toBe(true);
    expect(typeof (window as unknown as { __wishlistParse?: unknown }).__wishlistParse).toBe(
      "function",
    );
  });

  it("parses HTML handed over by the fetch tier", () => {
    const html = `<!doctype html><html><head>
      <script type="application/ld+json">${JSON.stringify({
        "@type": "Product",
        name: "Bundled Product",
        image: "https://cdn.example/a.jpg",
        offers: { price: "42.50", priceCurrency: "USD" },
      })}</script></head><body></body></html>`;

    (window as unknown as { __wishlistParse: (request: unknown) => void }).__wishlistParse({
      id: "test-1",
      url: "https://shop.example/p/bundled",
      html,
    });

    const result = messages.find((message) => message.id === "test-1");
    expect(result?.type).toBe("scrape-result");
    expect(result?.product?.title).toBe("Bundled Product");
    expect(result?.product?.price).toBe("42.5");
  });
});
