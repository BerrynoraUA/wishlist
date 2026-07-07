import { genericScrapers } from "./helpers/generic";
import { hasApiAdapter, scrapeWithApiAdapter } from "./api-adapters";
import { getStoreScraper } from "./helpers/stores";
import { emptyProduct, type ProductData } from "./helpers/types";
import { isSafeUrl } from "./helpers/validate-url";
import { getDomainScrapeStrategy } from "./domain-strategies";
import {
  getScraplingMode,
  isAcceptableProduct,
  logShadowComparison,
  scoreProduct,
  scrapeWithScrapling,
  scrapeWithScraplingResult,
  shouldSampleScraplingShadow,
  type ScraplingDiagnostics,
} from "./scrapling-client";

export type { ProductData };

export type ScrapeParserSource = {
  source: string;
  library: string;
};

export type ScrapeProductDiagnostics = {
  engine: "legacy" | "scrapling" | "official_api" | "internal_api";
  fetchMethod: string;
  selectedFetchMethod?: string;
  attempts: ScrapeFetchAttempt[];
  parserSources: Record<string, ScrapeParserSource>;
  warnings?: string[];
  api?: {
    provider: string;
    apiKind: "official" | "internal";
    adapter: string;
    itemId?: string;
  };
};

export type ScrapeFetchAttempt = {
  sequence: number;
  mode: string;
  purpose: string;
  outcome: "received" | "blocked" | "error" | "timeout" | "skipped";
  durationMs: number;
  status?: number;
  blockReason?: string;
  error?: string;
  parseScore?: number;
  parseAccepted?: boolean;
  selected?: boolean;
};

export type DetailedScrapeProduct = {
  product: ProductData | null;
  diagnostics?: ScrapeProductDiagnostics;
  blocked?: boolean;
  unavailable?: boolean;
  error?: string;
};

type LegacyScrapeResult = {
  product: ProductData | null;
  diagnostics: ScrapeProductDiagnostics;
  blocked?: boolean;
};

export async function scrapeProduct(url: string): Promise<ProductData | null> {
  const result = await scrapeProductDetailed(url);
  return result.product;
}

export async function scrapeProductDetailed(url: string): Promise<DetailedScrapeProduct> {
  url = canonicalizeProductUrl(url);
  if (hasApiAdapter(url)) {
    const api = await scrapeWithApiAdapter(url);
    if (!api) return { product: null, error: "API adapter not found" };
    const outcome = api.unavailable
      ? "skipped"
      : api.blocked
        ? "blocked"
        : api.reason?.includes("timeout")
          ? "timeout"
          : api.reason
            ? "error"
            : "received";
    return {
      product: api.product,
      blocked: api.blocked,
      unavailable: api.unavailable,
      error: api.reason,
      diagnostics: {
        engine: api.apiKind === "official" ? "official_api" : "internal_api",
        fetchMethod: api.attempts.at(-1)?.mode ?? "next_api",
        selectedFetchMethod: api.product ? (api.attempts.at(-1)?.mode ?? "next_api") : undefined,
        attempts:
          api.attempts.length > 0
            ? api.attempts.map((attempt, index) => ({
                sequence: index + 1,
                mode: attempt.mode,
                purpose: "product_api",
                outcome: attempt.outcome,
                durationMs: attempt.durationMs,
                status: attempt.status,
                blockReason: attempt.outcome === "blocked" ? api.reason : undefined,
                error: attempt.error,
                selected: Boolean(api.product) && index === api.attempts.length - 1,
              }))
            : [
                {
                  sequence: 1,
                  mode: "next_api",
                  purpose: "product_api",
                  outcome,
                  durationMs: api.durationMs,
                  status: api.status,
                  blockReason: api.blocked ? api.reason : undefined,
                  error: !api.blocked && api.reason ? api.reason : undefined,
                  selected: Boolean(api.product),
                },
              ],
        parserSources: api.parserSources,
        warnings: api.reason ? [api.reason] : undefined,
        api: {
          provider: api.provider,
          apiKind: api.apiKind,
          adapter: api.adapter,
          itemId: api.itemId,
        },
      },
    };
  }
  const domainStrategy = getDomainScrapeStrategy(url);
  if (
    domainStrategy === "scrapling_http" ||
    domainStrategy === "scrapling_browser" ||
    domainStrategy === "jina_reader"
  ) {
    return scrapeWithPreferredScrapling(url, domainStrategy);
  }
  const mode = getScraplingMode();
  let legacyResult: LegacyScrapeResult | null = null;
  let legacyError: unknown = null;

  try {
    legacyResult = await scrapeProductLegacy(url);
  } catch (error) {
    legacyError = error;
    if (mode === "disabled") throw error;
  }

  const legacyProduct = legacyResult?.product ?? null;

  if (mode === "disabled") {
    return {
      product: legacyProduct,
      diagnostics: legacyResult?.diagnostics,
      blocked: legacyResult?.blocked,
    };
  }

  if (mode === "shadow") {
    if (shouldSampleScraplingShadow(url)) {
      const scrapling = await scrapeWithScrapling(url);
      if (scrapling) logShadowComparison(legacyProduct, scrapling);
    }
    if (legacyError) throw legacyError;
    return {
      product: legacyProduct,
      diagnostics: legacyResult?.diagnostics,
      blocked: legacyResult?.blocked,
    };
  }

  if (isAcceptableProduct(legacyProduct)) {
    return { product: legacyProduct, diagnostics: legacyResult?.diagnostics };
  }

  const scraplingResult = await scrapeWithScraplingResult(url);
  const scrapling = scraplingResult.response;
  if (!scrapling) {
    const scraplingDiagnostics = scraplingResult.diagnostics
      ? toScraplingDiagnosticsValue(scraplingResult.diagnostics)
      : undefined;
    const blocked =
      legacyResult?.blocked ||
      scraplingResult.errorCode === "blocked" ||
      scraplingResult.status === 403 ||
      scraplingResult.status === 429;
    if (blocked) {
      return {
        product: legacyProduct,
        diagnostics: scraplingDiagnostics ?? legacyResult?.diagnostics,
        blocked: true,
        error: scraplingResult.errorMessage,
      };
    }
    if (scraplingDiagnostics) {
      return {
        product: legacyProduct,
        diagnostics: scraplingDiagnostics,
        error: scraplingResult.errorMessage,
      };
    }
    if (legacyError) throw legacyError;
    return {
      product: legacyProduct,
      diagnostics: scraplingDiagnostics ?? legacyResult?.diagnostics,
      error: scraplingResult.errorMessage,
    };
  }
  const scraplingDiagnostics = toScraplingDiagnostics(scrapling);
  if (scrapling.quality.accepted || scoreProduct(scrapling.product) > scoreProduct(legacyProduct)) {
    return { product: scrapling.product, diagnostics: scraplingDiagnostics };
  }
  return legacyProduct
    ? { product: legacyProduct, diagnostics: legacyResult?.diagnostics }
    : { product: scrapling.product, diagnostics: scraplingDiagnostics };
}

async function scrapeWithPreferredScrapling(
  url: string,
  strategy: "scrapling_http" | "scrapling_browser" | "jina_reader",
): Promise<DetailedScrapeProduct> {
  const preferred = await scrapeWithScraplingResult(url, strategy);
  if (preferred.response?.quality.accepted) {
    return {
      product: preferred.response.product,
      diagnostics: toScraplingDiagnostics(preferred.response),
    };
  }

  const fallback = await scrapeWithScraplingResult(url);
  const preferredResponse = preferred.response;
  const fallbackResponse = fallback.response;
  const useFallback = Boolean(
    fallbackResponse &&
    (!preferredResponse ||
      fallbackResponse.quality.accepted ||
      fallbackResponse.quality.score > preferredResponse.quality.score),
  );
  const selectedResponse = useFallback ? fallbackResponse : preferredResponse;
  if (selectedResponse) {
    const mergedDiagnostics = mergeScraplingDiagnostics(
      preferredResponse?.diagnostics ?? preferred.diagnostics,
      fallbackResponse?.diagnostics ?? fallback.diagnostics,
      useFallback ? "fallback" : "preferred",
    );
    return {
      product: selectedResponse.product,
      diagnostics: mergedDiagnostics
        ? toScraplingDiagnosticsValue(mergedDiagnostics, selectedResponse.quality.warnings)
        : toScraplingDiagnostics(selectedResponse),
    };
  }

  const mergedDiagnostics = mergeScraplingDiagnostics(
    preferred.diagnostics,
    fallback.diagnostics,
    fallback.diagnostics ? "fallback" : "preferred",
  );
  const finalResult = fallback.diagnostics ? fallback : preferred;
  return {
    product: null,
    diagnostics: mergedDiagnostics ? toScraplingDiagnosticsValue(mergedDiagnostics) : undefined,
    blocked:
      finalResult.errorCode === "blocked" ||
      finalResult.status === 403 ||
      finalResult.status === 429,
    error: finalResult.errorMessage,
  };
}

function mergeScraplingDiagnostics(
  preferred: ScraplingDiagnostics | undefined,
  fallback: ScraplingDiagnostics | undefined,
  selected: "preferred" | "fallback",
): ScraplingDiagnostics | undefined {
  const winner = selected === "fallback" ? fallback : preferred;
  if (!winner) return fallback ?? preferred;

  const attempts = [
    ...(preferred?.attempts.map((attempt) => ({
      ...attempt,
      selected: selected === "preferred" && attempt.selected,
    })) ?? []),
    ...(fallback?.attempts.map((attempt) => ({
      ...attempt,
      selected: selected === "fallback" && attempt.selected,
    })) ?? []),
  ].map((attempt, index) => ({ ...attempt, sequence: index + 1 }));

  return {
    ...winner,
    attempts,
    elapsed_ms: (preferred?.elapsed_ms ?? 0) + (fallback?.elapsed_ms ?? 0),
  };
}

function toScraplingDiagnostics(
  scrapling: Awaited<ReturnType<typeof scrapeWithScrapling>>,
): ScrapeProductDiagnostics | undefined {
  if (!scrapling) return undefined;
  return toScraplingDiagnosticsValue(scrapling.diagnostics, scrapling.quality.warnings);
}

function toScraplingDiagnosticsValue(
  diagnostics: ScraplingDiagnostics,
  warnings: string[] = [],
): ScrapeProductDiagnostics {
  return {
    engine: "scrapling",
    fetchMethod: diagnostics.fetch_mode,
    selectedFetchMethod: diagnostics.selected_fetch_mode ?? undefined,
    attempts: diagnostics.attempts.map((attempt) => ({
      sequence: attempt.sequence,
      mode: attempt.mode,
      purpose: attempt.purpose,
      outcome: attempt.outcome as ScrapeFetchAttempt["outcome"],
      durationMs: attempt.duration_ms,
      status: attempt.status ?? undefined,
      blockReason: attempt.block_reason ?? undefined,
      error: attempt.error ?? undefined,
      parseScore: attempt.parse_score ?? undefined,
      parseAccepted: attempt.parse_accepted ?? undefined,
      selected: attempt.selected,
    })),
    parserSources: Object.fromEntries(
      Object.entries(diagnostics.parser_sources).map(([field, source]) => [
        field,
        {
          source,
          library: scraplingLibrary(source),
        },
      ]),
    ),
    warnings,
  };
}

function scraplingLibrary(source: string): string {
  if (source === "json_ld") return "json / lxml";
  if (source === "regex") return "Python regex";
  if (source.startsWith("api:")) return "httpx / json";
  if (source.includes("embedded_state")) return "json / lxml";
  if (source.startsWith("adaptive")) return "Scrapling";
  return "lxml";
}

function canonicalizeProductUrl(value: string): string {
  try {
    const parsed = new URL(value);
    if (parsed.hostname.includes("aliexpress.") && parsed.pathname.startsWith("/item/")) {
      let skuId = parsed.searchParams.get("sku_id");
      if (!skuId) {
        const productContext = parsed.searchParams.get("pdp_ext_f");
        if (productContext) {
          try {
            const payload: unknown = JSON.parse(productContext);
            if (
              payload !== null &&
              typeof payload === "object" &&
              "sku_id" in payload &&
              (typeof payload.sku_id === "string" || typeof payload.sku_id === "number")
            ) {
              skuId = String(payload.sku_id);
            }
          } catch {
            // Ignore malformed advertising context.
          }
        }
      }
      const priceContext = parsed.searchParams.get("pdp_npi");
      const canonicalParams = new URLSearchParams();
      if (skuId) canonicalParams.set("sku_id", skuId);
      if (skuId && priceContext?.includes(skuId)) {
        canonicalParams.set("pdp_npi", priceContext);
      }
      parsed.search = canonicalParams.toString();
      parsed.hash = "";
      return parsed.href;
    }
  } catch {
    return value;
  }
  return value;
}

async function scrapeProductLegacy(url: string): Promise<LegacyScrapeResult> {
  const diagnostics: ScrapeProductDiagnostics = {
    engine: "legacy",
    fetchMethod: "direct_http",
    attempts: [
      {
        sequence: 1,
        mode: "direct_http",
        purpose: "product_page",
        outcome: "received",
        durationMs: 0,
        selected: true,
      },
    ],
    parserSources: {},
  };
  if (!isSafeUrl(url)) return { product: null, diagnostics };

  const configuredTimeout = Number(process.env.LEGACY_SCRAPER_TIMEOUT_MS);
  const timeoutMs =
    Number.isFinite(configuredTimeout) && configuredTimeout >= 1_000
      ? Math.min(configuredTimeout, 30_000)
      : 8_000;
  const signal = AbortSignal.timeout(timeoutMs);
  const fetchHeaders: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7",
  };

  let response = await fetch(url, { headers: fetchHeaders, signal });

  if (!response.ok) {
    const storeEntry = getStoreScraper(url);
    if (storeEntry?.async) {
      diagnostics.fetchMethod = "store_api_endpoint";
      const result = await (
        storeEntry.scraper as (html: string, url: string) => Promise<ProductData>
      )("", url);
      if (result && (result.title || result.image || result.price)) {
        addProductSources(diagnostics, result, `store:${storeEntry.pattern}`, "fetch / JSON");
        return { product: result, diagnostics };
      }
    }
    return {
      product: null,
      diagnostics,
      blocked: response.status === 403 || response.status === 429,
    };
  }

  let html = await response.text();
  if (isBlockedResponse(html)) {
    return { product: null, diagnostics, blocked: true };
  }
  if (isNonProductResponse(html, url)) {
    // A number of stores return HTTP 200 for a challenge, homepage or login
    // shell. Treat it as a failed legacy fetch so fallback mode can invoke the
    // direct HTTP and browser fallback.
    return { product: null, diagnostics };
  }

  const challengeMatch = html.match(/const\s+defaultHash\s*=\s*"([a-f0-9]{64})"/);
  if (challengeMatch && html.length < 1000 && html.includes("challenge_passed")) {
    const setCookies = response.headers.getSetCookie?.() ?? [];
    const cookiePairs = setCookies.map((c) => c.split(";")[0]).filter(Boolean);
    cookiePairs.push(`challenge_passed=${challengeMatch[1]}`);

    response = await fetch(url, {
      signal,
      headers: {
        ...fetchHeaders,
        Cookie: cookiePairs.join("; "),
      },
    });
    if (!response.ok) {
      return {
        product: null,
        diagnostics,
        blocked: response.status === 403 || response.status === 429,
      };
    }
    html = await response.text();
  }

  const storeEntry = getStoreScraper(url);
  let storeResult: ProductData | null = null;
  if (storeEntry) {
    if (storeEntry.async) diagnostics.fetchMethod = "store_api_endpoint";
    storeResult = storeEntry.async
      ? await (storeEntry.scraper as (html: string, url: string) => Promise<ProductData>)(html, url)
      : (storeEntry.scraper as (html: string, url: string) => ProductData)(html, url);
    if (storeResult.price) {
      addProductSources(
        diagnostics,
        storeResult,
        `store:${storeEntry.pattern}`,
        storeEntry.async ? "fetch / JSON" : "Cheerio",
      );
      return { product: storeResult, diagnostics };
    }
    const strictStoreDomains = [
      "target.com",
      "flipkart.com",
      "trendyol.com",
      "zalando.",
      "wildberries.ru",
    ];
    if (
      strictStoreDomains.some((domain) => new URL(url).hostname.includes(domain)) &&
      (storeResult.title || storeResult.image)
    ) {
      addProductSources(
        diagnostics,
        storeResult,
        `store:${storeEntry.pattern}`,
        storeEntry.async ? "fetch / JSON" : "Cheerio",
      );
      return { product: storeResult, diagnostics };
    }
  }

  const product: ProductData =
    storeResult && (storeResult.title || storeResult.image) ? { ...storeResult } : emptyProduct();
  if (storeResult && storeEntry) {
    addProductSources(
      diagnostics,
      storeResult,
      `store:${storeEntry.pattern}`,
      storeEntry.async ? "fetch / JSON" : "Cheerio",
    );
  }

  for (const scraper of genericScrapers) {
    const result = scraper(html, url);

    const source = genericSource(scraper.name);
    if (!product.title && result.title) {
      product.title = result.title;
      diagnostics.parserSources.title = source;
    }
    if (!product.description && result.description) {
      product.description = result.description;
      diagnostics.parserSources.description = source;
    }
    if (!product.image && result.image) {
      product.image = result.image;
      diagnostics.parserSources.image = source;
    }
    if (!product.price && result.price) {
      product.price = result.price;
      diagnostics.parserSources.price = source;
    }
    if (!product.discount_price && result.discount_price) {
      product.discount_price = result.discount_price;
      diagnostics.parserSources.discount_price = source;
    }
    if (!product.has_discount && result.has_discount) {
      product.has_discount = result.has_discount;
      diagnostics.parserSources.has_discount = source;
    }
    if (!product.discount_end_date && result.discount_end_date) {
      product.discount_end_date = result.discount_end_date;
      diagnostics.parserSources.discount_end_date = source;
    }
    if (!product.currency && result.currency) {
      product.currency = result.currency;
      diagnostics.parserSources.currency = source;
    }

    if (product.title && product.description && product.image && product.price) {
      break;
    }
  }

  if (product.discount_price && !product.price) {
    product.price = product.discount_price;
  }

  if (product.image && !product.image.startsWith("http")) {
    try {
      product.image = new URL(product.image, url).href;
    } catch {
      // Leave as-is if URL parsing fails.
    }
  }

  if (!product.title && !product.description && !product.image && !product.price) {
    return { product: null, diagnostics };
  }

  return { product, diagnostics };
}

function addProductSources(
  diagnostics: ScrapeProductDiagnostics,
  product: ProductData,
  source: string,
  library: string,
): void {
  for (const [field, value] of Object.entries(product)) {
    if (value !== null && value !== false && value !== "") {
      diagnostics.parserSources[field] = { source, library };
    }
  }
}

function genericSource(name: string): ScrapeParserSource {
  if (name === "scrapeWithJSONLD") return { source: "json_ld", library: "JSON.parse" };
  if (name === "scrapeWithRegex") return { source: "regex", library: "RegExp" };
  return { source: "html_meta_dom", library: "Cheerio" };
}

function isBlockedResponse(html: string): boolean {
  const sample = html.slice(0, 500_000).toLowerCase();
  return [
    "captcha",
    "cf-chl-",
    "cloudflare challenge",
    "attention required! | cloudflare",
    "please enable javascript and cookies to continue",
    "access denied",
  ].some((marker) => sample.includes(marker));
}

function isNonProductResponse(html: string, url: string): boolean {
  const sample = html.slice(0, 500_000).toLowerCase();
  const markers = [
    "<title>error page | ebay",
    "<title>javascript is disabled",
    "<title>register &amp; sign in - farfetch",
    "<title>register & sign in - farfetch",
    "please enable javascript to continue",
    "enable javascript and cookies to continue",
  ];
  if (markers.some((marker) => sample.includes(marker))) return true;

  let hostname = "";
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return true;
  }
  const title = sample.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
  if (hostname.includes("cdiscount.com") && title === "cdiscount.com") return true;
  if (
    hostname.includes("takealot.com") &&
    title.includes("online shopping") &&
    !sample.includes("plid96707778")
  ) {
    return true;
  }
  return false;
}
