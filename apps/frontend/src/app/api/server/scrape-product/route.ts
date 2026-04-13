import { NextRequest, NextResponse } from "next/server";
import { ProductData, emptyProduct } from "./helpers/types";
import { getStoreScraper } from "./helpers/stores";
import { genericScrapers } from "./helpers/generic";
import { isSafeUrl } from "./helpers/validate-url";

// Re-export for consumers (e.g. cron route)
export type { ProductData };

/**
 * Core scraping logic — fetches a URL and extracts product data.
 * Exported so the cron route can reuse it without HTTP overhead.
 *
 * Ланцюжок залежностей:
 * 1. Спочатку шукаємо скрапер для конкретного магазину за доменом.
 *    Якщо знайдено і він повертає ціну — повертаємо результат одразу.
 * 2. Якщо магазин невідомий або специфічний скрапер не знайшов ціну —
 *    застосовуємо універсальні скрапери (JSON-LD → Cheerio → Regex),
 *    мерджимо поля з кожного рівня.
 */
export async function scrapeProduct(url: string): Promise<ProductData | null> {
  if (!isSafeUrl(url)) return null;

  const fetchHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7",
  };

  let response = await fetch(url, { headers: fetchHeaders });

  if (!response.ok) {
    // For async store scrapers (API-based), try even when HTML fetch fails
    const storeEntry = getStoreScraper(url);
    if (storeEntry?.async) {
      const result = await (
        storeEntry.scraper as (
          html: string,
          url: string,
        ) => Promise<ProductData>
      )("", url);
      if (result && (result.title || result.image || result.price)) {
        return result;
      }
    }
    return null;
  }

  let html = await response.text();

  // Bypass JS cookie challenge (Horoshop-based sites like bujobox, hobymonster, leleka)
  // These return a small script that sets a "challenge_passed" cookie and reloads.
  // The retry must include session cookies (PHPSESSID etc.) from the first response.
  const challengeMatch = html.match(
    /const\s+defaultHash\s*=\s*"([a-f0-9]{64})"/,
  );
  if (
    challengeMatch &&
    html.length < 1000 &&
    html.includes("challenge_passed")
  ) {
    const setCookies = response.headers.getSetCookie?.() ?? [];
    const cookiePairs = setCookies.map((c) => c.split(";")[0]).filter(Boolean);
    cookiePairs.push(`challenge_passed=${challengeMatch[1]}`);

    response = await fetch(url, {
      headers: {
        ...fetchHeaders,
        Cookie: cookiePairs.join("; "),
      },
    });
    if (!response.ok) return null;
    html = await response.text();
  }

  // 1. Спробувати специфічний скрапер для відомого магазину
  const storeEntry = getStoreScraper(url);
  let storeResult: ProductData | null = null;
  if (storeEntry) {
    storeResult = storeEntry.async
      ? await (
          storeEntry.scraper as (
            html: string,
            url: string,
          ) => Promise<ProductData>
        )(html, url)
      : (storeEntry.scraper as (html: string, url: string) => ProductData)(
          html,
          url,
        );
    if (storeResult.price) {
      return storeResult;
    }
  }

  // 2. Універсальний ланцюжок (від найспецифічнішого до найзагальнішого)
  //    Якщо специфічний скрапер знайшов дані (без ціни), використовуємо їх як базу
  const product: ProductData =
    storeResult && (storeResult.title || storeResult.image)
      ? { ...storeResult }
      : emptyProduct();

  for (const scraper of genericScrapers) {
    const result = scraper(html, url);

    if (!product.title && result.title) product.title = result.title;
    if (!product.description && result.description)
      product.description = result.description;
    if (!product.image && result.image) product.image = result.image;
    if (!product.price && result.price) product.price = result.price;
    if (!product.discount_price && result.discount_price)
      product.discount_price = result.discount_price;
    if (!product.has_discount && result.has_discount)
      product.has_discount = result.has_discount;
    if (!product.discount_end_date && result.discount_end_date)
      product.discount_end_date = result.discount_end_date;
    if (!product.currency && result.currency)
      product.currency = result.currency;

    // Якщо всі ключові поля заповнені — виходимо
    if (
      product.title &&
      product.description &&
      product.image &&
      product.price
    ) {
      break;
    }
  }

  // Якщо discount_price знайдено, але немає базової ціни
  if (product.discount_price && !product.price) {
    product.price = product.discount_price;
  }

  // Resolve relative image URLs to absolute
  if (product.image && !product.image.startsWith("http")) {
    try {
      product.image = new URL(product.image, url).href;
    } catch {
      // leave as-is if URL parsing fails
    }
  }

  if (
    !product.title &&
    !product.description &&
    !product.image &&
    !product.price
  ) {
    return null;
  }

  return product;
}

// === HTTP HANDLERS ===

/** Browser `Origin` is scheme + host + port — no path (e.g. https://wishlane.net not …/ ). */
const SCRAPER_ALLOWED_ORIGINS = ["https://wishlane.net"];

/**
 * Restrict cross-origin access to the app origin. Requests from other origins
 * get no CORS headers so browsers block them. Server-side calls have no Origin.
 */
function getCorsHeaders(request: NextRequest): Record<string, string> {
  const requestOrigin = request.headers.get("Origin") ?? "";
  if (!SCRAPER_ALLOWED_ORIGINS.includes(requestOrigin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": requestOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "Missing 'url' query parameter" },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    const product = await scrapeProduct(url);

    if (!product) {
      return NextResponse.json(
        { error: "Could not extract any product data" },
        { status: 404, headers: corsHeaders },
      );
    }

    return NextResponse.json(product, { headers: corsHeaders });
  } catch {
    return NextResponse.json(
      { error: "Failed to scrape" },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  try {
    const { url } = await request.json();

    const product = await scrapeProduct(url);

    if (!product) {
      return NextResponse.json(
        { error: "Could not extract any product data" },
        { status: 404, headers: corsHeaders },
      );
    }

    return NextResponse.json(product, { headers: corsHeaders });
  } catch {
    return NextResponse.json(
      { error: "Failed to scrape" },
      { status: 500, headers: corsHeaders },
    );
  }
}
