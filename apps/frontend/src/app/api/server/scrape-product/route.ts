import { NextRequest, NextResponse } from "next/server";
import { ProductData, emptyProduct } from "./helpers/types";
import { getStoreScraper } from "./helpers/stores";
import { genericScrapers } from "./helpers/generic";

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
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Language": "uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  if (!response.ok) return null;

  const html = await response.text();

  // 1. Спробувати специфічний скрапер для відомого магазину
  const storeScraper = getStoreScraper(url);
  if (storeScraper) {
    const storeResult = storeScraper(html, url);
    if (storeResult.price) return storeResult;
  }

  // 2. Універсальний ланцюжок (від найспецифічнішого до найзагальнішого)
  const product: ProductData = emptyProduct();

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

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "Missing 'url' query parameter" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  try {
    const product = await scrapeProduct(url);

    if (!product) {
      return NextResponse.json(
        { error: "Could not extract any product data" },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json(product, { headers: CORS_HEADERS });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to scrape",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    const product = await scrapeProduct(url);

    if (!product) {
      return NextResponse.json(
        { error: "Could not extract any product data" },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json(product, { headers: CORS_HEADERS });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to scrape",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
