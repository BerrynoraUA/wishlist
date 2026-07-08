import "server-only";

import { emptyProduct, type ProductData } from "./helpers/types";

export type ApiKind = "official" | "internal";

export type ApiAdapterResult = {
  product: ProductData | null;
  provider: string;
  apiKind: ApiKind;
  adapter: string;
  itemId?: string;
  status?: number;
  durationMs: number;
  reason?: string;
  blocked?: boolean;
  unavailable?: boolean;
  parserSources: Record<string, { source: string; library: string }>;
  attempts: ApiTransportAttempt[];
};

export type ApiTransportAttempt = {
  mode: "next_api" | "python_api_http";
  outcome: "received" | "blocked" | "error" | "timeout" | "skipped";
  durationMs: number;
  status?: number;
  error?: string;
};

type PythonApiRequest = {
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
};

type ApiAdapter = {
  id: string;
  provider: string;
  kind: ApiKind;
  matches: (url: URL) => boolean;
  itemId: (url: URL) => string | null;
  credentials: () => boolean;
  request: (itemId: string, url: URL) => Promise<Response>;
  pythonRequest?: (itemId: string, url: URL) => Promise<PythonApiRequest>;
  parse: (payload: unknown, url: URL) => ProductData;
};

const JSON_SOURCES = (product: ProductData, adapter: ApiAdapter) =>
  Object.fromEntries(
    Object.entries(product)
      .filter(([, value]) => value !== null && value !== false)
      .map(([field]) => [
        field,
        { source: `${adapter.kind}_api:${adapter.id}`, library: "fetch / JSON" },
      ]),
  );

const adapters: ApiAdapter[] = [
  {
    id: "ebay_browse",
    provider: "eBay Browse API",
    kind: "official",
    matches: (url) => domainMatches(url, "ebay."),
    itemId: (url) => matchPath(url, /\/itm\/(?:[^/]+\/)?(\d+)/i),
    credentials: () => hasEnv("EBAY_CLIENT_ID", "EBAY_CLIENT_SECRET"),
    request: async (itemId) => {
      const token = await ebayApplicationToken();
      return fetch(
        `https://api.ebay.com/buy/browse/v1/item/get_item_by_legacy_id?legacy_item_id=${encodeURIComponent(itemId)}`,
        {
          headers: { Authorization: `Bearer ${token}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" },
          cache: "no-store",
          signal: AbortSignal.timeout(8_000),
        },
      );
    },
    pythonRequest: async (itemId) => {
      const token = await ebayApplicationToken();
      return {
        url: `https://api.ebay.com/buy/browse/v1/item/get_item_by_legacy_id?legacy_item_id=${encodeURIComponent(itemId)}`,
        headers: {
          Authorization: `Bearer ${token}`,
          "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        },
      };
    },
    parse: (payload) => {
      const value = record(payload);
      const price = record(value?.price);
      const image = record(value?.image);
      const additionalImages = array(value?.additionalImages);
      return product({
        title: text(value?.title),
        image: text(image?.imageUrl) ?? text(record(additionalImages[0])?.imageUrl),
        price: text(price?.value),
        currency: text(price?.currency),
      });
    },
  },
  {
    id: "etsy_open_v3",
    provider: "Etsy Open API v3",
    kind: "official",
    matches: (url) => domainMatches(url, "etsy."),
    itemId: (url) => matchPath(url, /\/listing\/(\d+)/i),
    credentials: () => hasEnv("ETSY_API_KEY"),
    request: async (itemId) => {
      const headers = { "x-api-key": process.env.ETSY_API_KEY! };
      const [listing, images] = await Promise.all([
        fetch(`https://openapi.etsy.com/v3/application/listings/${encodeURIComponent(itemId)}`, {
          headers,
          cache: "no-store",
          signal: AbortSignal.timeout(8_000),
        }),
        fetch(
          `https://openapi.etsy.com/v3/application/listings/${encodeURIComponent(itemId)}/images`,
          { headers, cache: "no-store", signal: AbortSignal.timeout(8_000) },
        ),
      ]);
      if (!listing.ok) return listing;
      const listingPayload = record(await listing.json()) ?? {};
      const imagePayload = images.ok ? record(await images.json()) : null;
      return Response.json(
        { ...listingPayload, images: array(imagePayload?.results) },
        { status: listing.status },
      );
    },
    pythonRequest: async (itemId) => ({
      url: `https://openapi.etsy.com/v3/application/listings/${encodeURIComponent(itemId)}`,
      headers: { "x-api-key": process.env.ETSY_API_KEY! },
    }),
    parse: (payload) => {
      const value = record(payload);
      const price = record(value?.price);
      const images = array(value?.images);
      return product({
        title: text(value?.title),
        description: text(value?.description),
        image:
          text(record(images[0])?.url_fullxfull) ??
          text(record(images[0])?.url_570xN) ??
          text(record(images[0])?.url_75x75),
        price: money(price),
        currency: text(price?.currency_code),
      });
    },
  },
  {
    id: "discogs_database",
    provider: "Discogs API",
    kind: "official",
    matches: (url) => domainMatches(url, "discogs.com"),
    itemId: (url) => matchPath(url, /\/(?:release|master)\/(\d+)/i),
    credentials: () => true,
    request: (itemId, url) => {
      const resource = url.pathname.toLowerCase().includes("/master/") ? "masters" : "releases";
      const token = process.env.DISCOGS_TOKEN?.trim();
      return fetch(`https://api.discogs.com/${resource}/${encodeURIComponent(itemId)}`, {
        headers: {
          ...(token ? { Authorization: `Discogs token=${token}` } : {}),
          "User-Agent": "Wishlane/1.0",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
    },
    pythonRequest: async (itemId, url) => {
      const resource = url.pathname.toLowerCase().includes("/master/") ? "masters" : "releases";
      const token = process.env.DISCOGS_TOKEN?.trim();
      return {
        url: `https://api.discogs.com/${resource}/${encodeURIComponent(itemId)}`,
        headers: {
          ...(token ? { Authorization: `Discogs token=${token}` } : {}),
          "User-Agent": "Wishlane/1.0",
        },
      };
    },
    parse: (payload) => {
      const value = record(payload);
      const images = array(value?.images);
      return product({
        title: text(value?.title),
        description: text(value?.notes),
        image: text(record(images[0])?.uri) ?? text(record(images[0])?.resource_url),
      });
    },
  },
  {
    id: "gunbroker_items",
    provider: "GunBroker REST API",
    kind: "official",
    matches: (url) => domainMatches(url, "gunbroker.com"),
    itemId: (url) =>
      matchPath(url, /\/item\/(\d+)/i) ??
      url.searchParams.get("itemId") ??
      url.searchParams.get("item"),
    credentials: () => hasEnv("GUNBROKER_DEV_KEY"),
    request: (itemId) =>
      fetch(`https://api.gunbroker.com/v1/Items/${encodeURIComponent(itemId)}`, {
        headers: { "X-DevKey": process.env.GUNBROKER_DEV_KEY! },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      }),
    pythonRequest: async (itemId) => ({
      url: `https://api.gunbroker.com/v1/Items/${encodeURIComponent(itemId)}`,
      headers: { "X-DevKey": process.env.GUNBROKER_DEV_KEY! },
    }),
    parse: (payload) => {
      const value = record(payload);
      const pictures = array(value?.Pictures ?? value?.pictures);
      return product({
        title: text(value?.Title ?? value?.title),
        description: text(value?.Description ?? value?.description),
        image:
          text(value?.PictureURL ?? value?.pictureURL) ??
          text(record(pictures[0])?.URL ?? record(pictures[0])?.url),
        price: numberText(
          value?.Price ??
            value?.price ??
            value?.CurrentBid ??
            value?.BuyNowPrice ??
            value?.StartingBid,
        ),
        currency: "USD",
      });
    },
  },
  {
    id: "bol_catalog",
    provider: "bol Marketing Catalog API",
    kind: "official",
    matches: (url) => domainMatches(url, "bol.com"),
    itemId: (url) => url.searchParams.get("ean") ?? matchPath(url, /\/(\d{13,16})(?:[/?]|$)/),
    credentials: () => hasEnv("BOL_CLIENT_ID", "BOL_CLIENT_SECRET"),
    request: async (itemId) => {
      const token = await bolAccessToken();
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Accept-Language": "nl-NL",
      };
      let ean = itemId;
      if (itemId.length !== 13) {
        const conversion = await fetch(
          `https://api.bol.com/marketing/catalog/v1/products/${encodeURIComponent(itemId)}/to-ean`,
          { headers, cache: "no-store", signal: AbortSignal.timeout(8_000) },
        );
        if (!conversion.ok) return conversion;
        const converted = record(await conversion.json());
        ean = text(converted?.ean) ?? text(array(converted?.eans)[0]) ?? "";
        if (!ean)
          return Response.json({ error: "EAN conversion returned no EAN" }, { status: 422 });
      }
      return fetch(
        `https://api.bol.com/marketing/catalog/v1/products/${encodeURIComponent(ean)}?country-code=NL&include-image=true&include-offer=true`,
        { headers, cache: "no-store", signal: AbortSignal.timeout(8_000) },
      );
    },
    pythonRequest: async (itemId) => {
      const token = await bolAccessToken();
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Accept-Language": "nl-NL",
      };
      let ean = itemId;
      if (itemId.length !== 13) {
        const conversion = await fetchThroughPython({
          url: `https://api.bol.com/marketing/catalog/v1/products/${encodeURIComponent(itemId)}/to-ean`,
          headers,
        });
        const converted = record(await conversion.response.json().catch(() => null));
        ean = text(converted?.ean) ?? text(array(converted?.eans)[0]) ?? "";
        if (!ean) throw new Error("bol EAN conversion failed through Python");
      }
      return {
        url: `https://api.bol.com/marketing/catalog/v1/products/${encodeURIComponent(ean)}?country-code=NL&include-image=true&include-offer=true`,
        headers,
      };
    },
    parse: (payload) => {
      const value = record(payload);
      const products = array(value?.products);
      const item = record(products[0]) ?? value;
      const offer = record(item?.offer) ?? record(array(item?.offers)[0]);
      const image = record(item?.image) ?? record(array(item?.images)[0]);
      const currentPrice = numberText(offer?.price);
      const oldPrice = numberText(offer?.strikethroughPrice);
      const hasDiscount = Boolean(currentPrice && oldPrice && currentPrice !== oldPrice);
      return product({
        title: text(item?.title),
        description: text(item?.description),
        image: text(image?.url),
        price: hasDiscount ? oldPrice : currentPrice,
        discount_price: hasDiscount ? currentPrice : null,
        has_discount: hasDiscount,
        currency: text(offer?.currency) ?? "EUR",
      });
    },
  },
  {
    id: "aliexpress_affiliate",
    provider: "AliExpress Affiliate API",
    kind: "official",
    matches: (url) => domainMatches(url, "aliexpress."),
    itemId: (url) => matchPath(url, /\/item\/(\d+)\.html/i),
    credentials: () =>
      hasEnv("ALIEXPRESS_APP_KEY", "ALIEXPRESS_APP_SECRET", "ALIEXPRESS_TRACKING_ID"),
    request: async (itemId) => {
      const params = await aliExpressSignedParams(itemId);
      return fetch(`https://api-sg.aliexpress.com/sync?${params}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
    },
    pythonRequest: async (itemId) => {
      const params = await aliExpressSignedParams(itemId);
      return { url: `https://api-sg.aliexpress.com/sync?${params}` };
    },
    parse: (payload) => {
      const root = record(payload);
      const response = findRecord(root, "aliexpress_affiliate_productdetail_get_response");
      const result = record(response?.resp_result);
      const resultValue =
        typeof result?.result === "string" ? safeJson(result.result) : result?.result;
      const products = array(record(resultValue)?.products ?? resultValue);
      const item = record(products[0]) ?? record(resultValue);
      return product({
        title: text(item?.product_title),
        image: text(item?.product_main_image_url),
        price: text(item?.target_sale_price ?? item?.sale_price),
        currency: text(item?.target_sale_price_currency ?? item?.sale_price_currency),
      });
    },
  },
  {
    id: "aukro_offer_detail",
    provider: "Aukro Offer Detail API",
    kind: "internal",
    matches: (url) => domainMatches(url, "aukro.cz"),
    itemId: (url) => matchPath(url, /-(\d+)(?:\/|$)/),
    credentials: () => true,
    request: (itemId, url) => {
      const endpoint = aukroApiUrl(itemId, url);
      return fetch(endpoint, {
        headers: storefrontHeaders(url.origin),
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
    },
    pythonRequest: async (itemId, url) => ({
      url: aukroApiUrl(itemId, url),
      headers: storefrontHeaders(url.origin),
    }),
    parse: (payload) => {
      const value = record(payload);
      const price = record(value?.price);
      const retailPrice = record(value?.retailPrice);
      const currentPrice = numberText(price?.amount);
      const oldPrice = numberText(retailPrice?.amount);
      const hasDiscount = Boolean(
        currentPrice && oldPrice && Number(oldPrice) > Number(currentPrice),
      );
      const images = record(value?.images);
      const originalImages = array(images?.original);
      const largeImages = array(images?.large);
      return product({
        title: text(value?.name),
        description: text(value?.descriptionStripped) ?? text(value?.shortDescription),
        image: text(record(originalImages[0])?.url) ?? text(record(largeImages[0])?.url),
        price: hasDiscount ? oldPrice : currentPrice,
        discount_price: hasDiscount ? currentPrice : null,
        has_discount: hasDiscount,
        currency: text(price?.currency),
      });
    },
  },
  {
    id: "bestbuy_ca_catalog",
    provider: "Best Buy Canada Catalog API",
    kind: "internal",
    matches: (url) => domainMatches(url, "bestbuy.ca"),
    itemId: (url) => matchPath(url, /\/product\/(?:[^/]+\/)?(\d+)(?:\/|$)/i),
    credentials: () => true,
    request: (itemId, url) => {
      const endpoint = bestBuyApiUrl(itemId);
      return fetch(endpoint, {
        headers: storefrontHeaders(url.origin),
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
    },
    pythonRequest: async (itemId, url) => ({
      url: bestBuyApiUrl(itemId),
      headers: storefrontHeaders(url.origin),
    }),
    parse: (payload) => {
      const item = record(array(record(payload)?.items)[0]);
      const currentPrice = numberText(item?.salePrice);
      const regularPrice = numberText(item?.regularPrice);
      const hasDiscount = Boolean(
        currentPrice && regularPrice && Number(regularPrice) > Number(currentPrice),
      );
      return product({
        title: text(item?.name),
        description: text(item?.shortDescription),
        image: text(item?.highResImage) ?? text(item?.thumbnailImage),
        price: hasDiscount ? regularPrice : currentPrice,
        discount_price: hasDiscount ? currentPrice : null,
        has_discount: hasDiscount,
        discount_end_date: text(item?.saleEndDate),
        currency: "CAD",
      });
    },
  },
  {
    id: "digitec_galaxus_graphql",
    provider: "Digitec Galaxus Product GraphQL",
    kind: "internal",
    matches: (url) => domainMatches(url, "digitec.ch") || domainMatches(url, "galaxus.ch"),
    itemId: (url) => matchPath(url, /-(\d+)(?:\/|$)/),
    credentials: () => true,
    request: (itemId, url) => {
      const request = digitecGalaxusRequest(itemId, url);
      return fetch(request.url, {
        method: "POST",
        headers: request.headers,
        body: request.body,
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
    },
    pythonRequest: async (itemId, url) => digitecGalaxusRequest(itemId, url),
    parse: (payload) => {
      const response = record(array(payload)[0]);
      const data = record(response?.data);
      const connection = record(data?.productsWithOfferDefault);
      const entry = record(array(connection?.products)[0]);
      const item = record(entry?.product);
      const offer = record(entry?.offer);
      const price = record(offer?.price);
      const insteadOf = record(record(offer?.insteadOfPrice)?.price);
      const currentPrice = numberText(price?.amountInclusive);
      const oldPrice = numberText(insteadOf?.amountInclusive);
      const hasDiscount = Boolean(
        currentPrice && oldPrice && Number(oldPrice) > Number(currentPrice),
      );
      const images = array(item?.images);
      return product({
        title: text(item?.name),
        image: text(record(images[0])?.url),
        price: hasDiscount ? oldPrice : currentPrice,
        discount_price: hasDiscount ? currentPrice : null,
        has_discount: hasDiscount,
        currency: text(price?.currency),
      });
    },
  },
  {
    id: "rozetka_catalog",
    provider: "Rozetka Catalog API",
    kind: "internal",
    matches: (url) => domainMatches(url, "rozetka.com.ua"),
    itemId: (url) => matchPath(url, /\/p(\d+)(?:\/|$)/i),
    credentials: () => true,
    request: (itemId) => fetchRozetka(itemId),
    pythonRequest: async (itemId) => ({
      url: rozetkaApiUrl(itemId),
      headers: storefrontHeaders("https://rozetka.com.ua/"),
    }),
    parse: (payload) => parseStorefrontPayload(payload, "UAH"),
  },
  {
    id: "noon_catalog",
    provider: "Noon Catalog API",
    kind: "internal",
    matches: (url) => domainMatches(url, "noon.com"),
    itemId: (url) => matchPath(url, /\/([NZ][A-Z0-9]+)\/p(?:\/|$)/i),
    credentials: () => true,
    request: (itemId, url) => {
      const endpoint = noonApiUrl(itemId, url);
      return fetch(endpoint, {
        headers: storefrontHeaders(url.origin),
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
    },
    pythonRequest: async (itemId, url) => ({
      url: noonApiUrl(itemId, url),
      headers: storefrontHeaders(url.origin),
    }),
    parse: (payload) => parseStorefrontPayload(payload, "AED"),
  },
  {
    id: "meesho_product",
    provider: "Meesho Product API",
    kind: "internal",
    matches: (url) => domainMatches(url, "meesho.com"),
    itemId: (url) => matchPath(url, /\/p\/([a-z0-9]+)(?:\/|$)/i),
    credentials: () => true,
    request: (itemId, url) => {
      const endpoint = meeshoApiUrl(itemId);
      return fetch(endpoint, {
        headers: storefrontHeaders(url.origin),
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
    },
    pythonRequest: async (itemId, url) => ({
      url: meeshoApiUrl(itemId),
      headers: storefrontHeaders(url.origin),
    }),
    parse: (payload) => parseStorefrontPayload(payload, "INR"),
  },
  {
    id: "lazada_pdp_modules",
    provider: "Lazada PDP Modules API",
    kind: "internal",
    matches: (url) => domainMatches(url, "lazada."),
    itemId: (url) =>
      url.searchParams.get("itemId") ??
      url.searchParams.get("item_id") ??
      matchPath(url, /-i(\d+)-s\d+\.html/i),
    credentials: () => true,
    request: (itemId, url) => {
      const endpoint = lazadaApiUrl(itemId, url);
      return fetch(endpoint, {
        headers: storefrontHeaders(url.origin),
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
    },
    pythonRequest: async (itemId, url) => ({
      url: lazadaApiUrl(itemId, url),
      headers: storefrontHeaders(url.origin),
    }),
    parse: (payload) => parseStorefrontPayload(payload),
  },
];

const activeApiAdapters = adapters.filter((adapter) => adapter.kind === "internal");

export function hasApiAdapter(url: string): boolean {
  try {
    const parsed = new URL(url);
    return activeApiAdapters.some((adapter) => adapter.matches(parsed));
  } catch {
    return false;
  }
}

export async function scrapeWithApiAdapter(url: string): Promise<ApiAdapterResult | null> {
  const parsed = new URL(url);
  const adapter = activeApiAdapters.find((candidate) => candidate.matches(parsed));
  if (!adapter) return null;

  const startedAt = Date.now();
  const itemId = adapter.itemId(parsed);
  const base = {
    provider: adapter.provider,
    apiKind: adapter.kind,
    adapter: adapter.id,
    durationMs: 0,
    parserSources: {},
    attempts: [],
  } satisfies Omit<ApiAdapterResult, "product">;

  if (!itemId) {
    return {
      ...base,
      product: null,
      durationMs: Date.now() - startedAt,
      unavailable: true,
      reason: "api_identifier_unavailable",
    };
  }
  if (!adapter.credentials()) {
    return {
      ...base,
      itemId,
      product: null,
      durationMs: Date.now() - startedAt,
      unavailable: true,
      reason: "api_credentials_missing",
    };
  }

  try {
    const directStartedAt = Date.now();
    const response = await adapter.request(itemId, parsed);
    let attempts: ApiTransportAttempt[] = [
      {
        mode: "next_api",
        outcome: response.status === 403 || response.status === 429 ? "blocked" : "received",
        durationMs: Date.now() - directStartedAt,
        status: response.status,
      },
    ];
    if ((response.status === 403 || response.status === 429) && adapter.pythonRequest) {
      const fallback = await fetchThroughPython(await adapter.pythonRequest(itemId, parsed));
      attempts = [...attempts, ...fallback.attempts];
      return resultFromResponse(
        adapter,
        parsed,
        itemId,
        base,
        fallback.response,
        attempts,
        startedAt,
      );
    }
    return resultFromResponse(adapter, parsed, itemId, base, response, attempts, startedAt);
  } catch (error) {
    const directAttempt: ApiTransportAttempt = {
      mode: "next_api",
      outcome: error instanceof DOMException && error.name === "TimeoutError" ? "timeout" : "error",
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "api_network_error",
    };
    if (adapter.pythonRequest) {
      try {
        const fallback = await fetchThroughPython(await adapter.pythonRequest(itemId, parsed));
        return resultFromResponse(
          adapter,
          parsed,
          itemId,
          base,
          fallback.response,
          [directAttempt, ...fallback.attempts],
          startedAt,
        );
      } catch {
        // Preserve the original transport failure below.
      }
    }
    return {
      ...base,
      itemId,
      product: null,
      durationMs: Date.now() - startedAt,
      attempts: [directAttempt],
      reason:
        error instanceof DOMException && error.name === "TimeoutError"
          ? "api_timeout"
          : "api_network_error",
    };
  }
}

async function resultFromResponse(
  adapter: ApiAdapter,
  parsed: URL,
  itemId: string,
  base: Omit<ApiAdapterResult, "product">,
  response: Response,
  attempts: ApiTransportAttempt[],
  startedAt: number,
): Promise<ApiAdapterResult> {
  const payload: unknown = await response.json().catch(() => null);
  const durationMs = Date.now() - startedAt;
  if (!response.ok) {
    return {
      ...base,
      itemId,
      product: null,
      durationMs,
      attempts,
      status: response.status,
      blocked: response.status === 403 || response.status === 429,
      reason:
        response.status === 401
          ? "api_credentials_invalid"
          : response.status === 404
            ? "api_item_not_found"
            : response.status === 429
              ? "api_rate_limited"
              : "api_request_failed",
    };
  }
  const parsedProduct = adapter.parse(payload, parsed);
  const hasData = Boolean(parsedProduct.title || parsedProduct.price || parsedProduct.image);
  return {
    ...base,
    itemId,
    product: hasData ? parsedProduct : null,
    durationMs,
    status: response.status,
    reason: hasData ? undefined : "api_invalid_payload",
    parserSources: JSON_SOURCES(parsedProduct, adapter),
    attempts,
  };
}

function domainMatches(url: URL, domain: string): boolean {
  const hostname = url.hostname.toLowerCase();
  const normalizedDomain = domain.toLowerCase();
  if (normalizedDomain.endsWith(".")) {
    const marketplace = normalizedDomain.slice(0, -1);
    return (
      hostname === marketplace ||
      hostname.startsWith(`${marketplace}.`) ||
      hostname.includes(`.${marketplace}.`)
    );
  }
  return hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`);
}

function matchPath(url: URL, pattern: RegExp): string | null {
  return url.pathname.match(pattern)?.[1] ?? null;
}

function hasEnv(...keys: string[]): boolean {
  return keys.every((key) => Boolean(process.env[key]?.trim()));
}

function product(values: Partial<ProductData>): ProductData {
  return { ...emptyProduct(), ...values };
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberText(value: unknown): string | null {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : text(value);
}

function money(value: Record<string, unknown> | null): string | null {
  const amount = value?.amount;
  const divisor = value?.divisor;
  if (typeof amount !== "number" || typeof divisor !== "number" || divisor === 0) return null;
  return String(amount / divisor);
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function findRecord(
  value: Record<string, unknown> | null,
  key: string,
): Record<string, unknown> | null {
  if (!value) return null;
  const direct = record(value[key]);
  if (direct) return direct;
  for (const nested of Object.values(value)) {
    const result = findRecord(record(nested), key);
    if (result) return result;
  }
  return null;
}

function storefrontHeaders(referer: string): Record<string, string> {
  return {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: referer,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
  };
}

function rozetkaApiUrl(itemId: string): string {
  return `https://rozetka.com.ua/api/product-api/v4/goods/get-main?front-type=xl&country=UA&lang=uk&goodsId=${encodeURIComponent(itemId)}`;
}

function bestBuyApiUrl(itemId: string): string {
  return `https://www.bestbuy.ca/api/v1/catalog/query?ids=${encodeURIComponent(itemId)}&lang=en-CA`;
}

function digitecGalaxusRequest(itemId: string, productUrl: URL): PythonApiRequest {
  const portal = domainMatches(productUrl, "digitec.ch") ? "25" : "22";
  const query =
    "query GET_PRODUCTS_WITH_OFFER_DEFAULT($productIds: [Int!]!) { productsWithOfferDefault(productIds: $productIds, filterProductsByPortal: false, includeProductsOfOtherMandators: true) { products { product { productId name images { url height width } } offer { price { amountInclusive currency } insteadOfPrice { price { amountInclusive currency } } } } } }";
  return {
    url: `${productUrl.origin}/api/graphql/get-products-with-offer-default`,
    method: "POST",
    headers: {
      ...storefrontHeaders(productUrl.href),
      "Content-Type": "application/json",
      Origin: productUrl.origin,
      "x-dg-graphql-client-name": "isomorph",
      "x-dg-language": "en-US",
      "x-dg-portal": portal,
      "x-dg-routename": "/product/[titleAndProductId]",
    },
    body: JSON.stringify([
      {
        operationName: "GET_PRODUCTS_WITH_OFFER_DEFAULT",
        variables: { productIds: [Number(itemId)] },
        query,
      },
    ]),
  };
}

function aukroApiUrl(itemId: string, productUrl: URL): string {
  const params = new URLSearchParams({
    pageType: "DETAIL",
    requestedFor: "DETAIL",
    itemDetailModsEnabled: "true",
    itemModVisitType: "DIRECT",
    itemModDeviceType: "DESKTOP",
  });
  return `${productUrl.origin}/backend-web/api/offers/${encodeURIComponent(itemId)}/offerDetail?${params}`;
}

function fetchRozetka(itemId: string): Promise<Response> {
  return fetch(rozetkaApiUrl(itemId), {
    headers: storefrontHeaders("https://rozetka.com.ua/"),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
}

function noonApiUrl(itemId: string, productUrl: URL): string {
  const locale = productUrl.pathname.split("/").filter(Boolean)[0] ?? "uae-en";
  return `https://www.noon.com/_svc/catalog/api/v3/u/${encodeURIComponent(itemId)}/pdp?locale=${encodeURIComponent(locale)}`;
}

function meeshoApiUrl(itemId: string): string {
  return `https://www.meesho.com/api/v1/product/${encodeURIComponent(itemId)}`;
}

function lazadaApiUrl(itemId: string, productUrl: URL): string {
  return `${productUrl.origin}/pdp-modules/${encodeURIComponent(itemId)}.html`;
}

function parseStorefrontPayload(payload: unknown, defaultCurrency?: string): ProductData {
  const candidate = bestProductRecord(payload);
  if (!candidate) return emptyProduct();
  const currentPrice = firstText(candidate, [
    "salePrice",
    "sale_price",
    "currentPrice",
    "current_price",
    "sellingPrice",
    "price",
  ]);
  const oldPrice = firstText(candidate, [
    "originalPrice",
    "original_price",
    "oldPrice",
    "old_price",
    "mrp",
  ]);
  const hasDiscount = Boolean(currentPrice && oldPrice && currentPrice !== oldPrice);
  return product({
    title: firstText(candidate, ["title", "name", "productName", "product_name"]),
    description: firstText(candidate, ["description", "shortDescription", "short_description"]),
    image: firstImage(candidate),
    price: hasDiscount ? oldPrice : currentPrice,
    discount_price: hasDiscount ? currentPrice : null,
    has_discount: hasDiscount,
    currency:
      firstText(candidate, ["currency", "currencyCode", "currency_code", "priceCurrency"]) ??
      defaultCurrency ??
      null,
  });
}

function bestProductRecord(value: unknown): Record<string, unknown> | null {
  let bestScore = 0;
  let bestValue: Record<string, unknown> | null = null;
  const visit = (candidate: unknown): void => {
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }
    const object = record(candidate);
    if (!object) return;
    const score =
      (firstText(object, ["title", "name", "productName", "product_name"]) ? 3 : 0) +
      (firstText(object, ["salePrice", "sale_price", "currentPrice", "sellingPrice", "price"])
        ? 3
        : 0) +
      (firstImage(object) ? 2 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestValue = object;
    }
    Object.values(object).forEach(visit);
  };
  visit(value);
  return bestValue;
}

function firstText(value: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const candidate = value[key];
    const normalized = numberText(
      record(candidate)?.value ?? record(candidate)?.amount ?? candidate,
    );
    if (normalized) return normalized;
  }
  return null;
}

function firstImage(value: Record<string, unknown>): string | null {
  for (const key of ["image", "imageUrl", "image_url", "mainImage", "main_image", "images"]) {
    const result = nestedImage(value[key]);
    if (result) return result;
  }
  return null;
}

function nestedImage(value: unknown): string | null {
  const direct = text(value);
  if (direct?.startsWith("http")) return direct;

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = nestedImage(item);
      if (result) return result;
    }
    return null;
  }

  const object = record(value);
  if (!object) return null;
  for (const key of ["big", "large", "original", "url", "src", "imageUrl"]) {
    const result = nestedImage(object[key]);
    if (result) return result;
  }
  return null;
}

async function fetchThroughPython(request: PythonApiRequest): Promise<{
  response: Response;
  attempts: ApiTransportAttempt[];
}> {
  const serviceUrl = (
    process.env.SCRAPLING_SERVICE_URL?.trim() || "http://79.143.95.197:8001"
  ).replace(/\/$/, "");
  const response = await fetch(`${serviceUrl}/v1/api-fetch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: request.url,
      method: request.method ?? "GET",
      headers: request.headers ?? {},
      body: request.body,
      deadline_ms: 12_000,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(13_000),
  });
  const payload = record(await response.json().catch(() => null));
  const attempts = array(payload?.attempts).flatMap((raw) => {
    const attempt = record(raw);
    const mode = text(attempt?.mode);
    const outcome = text(attempt?.outcome);
    if (
      !mode ||
      mode !== "python_api_http" ||
      !outcome ||
      !["received", "blocked", "error", "timeout", "skipped"].includes(outcome)
    ) {
      return [];
    }
    return [
      {
        mode: mode as ApiTransportAttempt["mode"],
        outcome: outcome as ApiTransportAttempt["outcome"],
        durationMs: typeof attempt?.duration_ms === "number" ? attempt.duration_ms : 0,
        status: typeof attempt?.status === "number" ? attempt.status : undefined,
        error: text(attempt?.error) ?? undefined,
      },
    ];
  });
  const upstreamStatus = typeof payload?.status === "number" ? payload.status : response.status;
  const effectiveStatus =
    attempts.at(-1)?.outcome === "blocked" && upstreamStatus < 400 ? 403 : upstreamStatus;
  return {
    response: new Response(text(payload?.body) ?? "", { status: effectiveStatus }),
    attempts,
  };
}

let ebayTokenCache: { value: string; expiresAt: number } | null = null;
async function ebayApplicationToken(): Promise<string> {
  if (ebayTokenCache && ebayTokenCache.expiresAt > Date.now() + 30_000) return ebayTokenCache.value;
  const credentials = Buffer.from(
    `${process.env.EBAY_CLIENT_ID!}:${process.env.EBAY_CLIENT_SECRET!}`,
  ).toString("base64");
  const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`eBay OAuth failed (${response.status})`);
  const payload = record(await response.json());
  const token = text(payload?.access_token);
  if (!token) throw new Error("eBay OAuth returned no access token");
  const expiresIn = typeof payload?.expires_in === "number" ? payload.expires_in : 7_200;
  ebayTokenCache = { value: token, expiresAt: Date.now() + expiresIn * 1_000 };
  return token;
}

let bolTokenCache: { value: string; expiresAt: number } | null = null;
async function bolAccessToken(): Promise<string> {
  if (bolTokenCache && bolTokenCache.expiresAt > Date.now() + 30_000) return bolTokenCache.value;
  const credentials = Buffer.from(
    `${process.env.BOL_CLIENT_ID!}:${process.env.BOL_CLIENT_SECRET!}`,
  ).toString("base64");
  const response = await fetch("https://login.bol.com/token?grant_type=client_credentials", {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`bol OAuth failed (${response.status})`);
  const payload = record(await response.json());
  const token = text(payload?.access_token);
  if (!token) throw new Error("bol OAuth returned no access token");
  const expiresIn = typeof payload?.expires_in === "number" ? payload.expires_in : 300;
  bolTokenCache = { value: token, expiresAt: Date.now() + expiresIn * 1_000 };
  return token;
}

async function aliExpressSignedParams(itemId: string): Promise<string> {
  const values: Record<string, string> = {
    app_key: process.env.ALIEXPRESS_APP_KEY!,
    method: "aliexpress.affiliate.productdetail.get",
    product_ids: itemId,
    sign_method: "sha256",
    timestamp: String(Date.now()),
    tracking_id: process.env.ALIEXPRESS_TRACKING_ID!,
    v: "2.0",
  };
  const source =
    process.env.ALIEXPRESS_APP_SECRET! +
    Object.keys(values)
      .sort()
      .map((key) => `${key}${values[key]}`)
      .join("") +
    process.env.ALIEXPRESS_APP_SECRET!;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  values.sign = Buffer.from(digest).toString("hex").toUpperCase();
  return new URLSearchParams(values).toString();
}
