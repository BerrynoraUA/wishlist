import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@wishlist/backend/supabase/server";
import { scrapeProductDetailed } from "@/app/api/server/scrape-product/scraper";

export const maxDuration = 300;

const ADMIN_SECRET = process.env.CRON_SECRET as string;

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("Authorization");
  if (Boolean(ADMIN_SECRET) && authHeader === `Bearer ${ADMIN_SECRET}`) {
    return true;
  }

  const cookieStore = await cookies();
  const supabase = createServerClient({
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
        try {
          cookieStore.set(name, value, options);
        } catch {
          // ignore when cookies cannot be mutated in this context
        }
      });
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return Boolean(user);
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { urls } = (await request.json()) as { urls: string[] };

  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: "Missing or empty 'urls' array" }, { status: 400 });
  }

  const results = [];

  for (const url of urls) {
    const start = Date.now();
    try {
      const scraped = await scrapeProductDetailed(url);
      const product = scraped.product;
      const duration = Date.now() - start;

      if (scraped.unavailable) {
        results.push({
          url,
          status: "unavailable",
          error: scraped.error ?? "API is unavailable",
          data: product,
          duration,
          diagnostics: scraped.diagnostics,
        });
        continue;
      }

      const isApiResult =
        scraped.diagnostics?.engine === "official_api" ||
        scraped.diagnostics?.engine === "internal_api";

      if (!product && isApiResult) {
        results.push({
          url,
          status: scraped.blocked ? "blocked" : "failed",
          error: scraped.error ?? "API response could not be parsed",
          data: null,
          duration,
          diagnostics: scraped.diagnostics,
        });
        continue;
      }

      if (!isApiResult && isAccessFailure(scraped)) {
        results.push({
          url,
          status: "blocked",
          error:
            scraped.error ??
            (product ? "Product page could not be accessed" : "No product data could be accessed"),
          data: product,
          duration,
          diagnostics: scraped.diagnostics,
        });
        continue;
      }

      // isAccessFailure guarantees that a product is present here.
      if (!product) continue;

      // Вважаємо success якщо title + image + price заскрапились
      const hasTitle = !!product.title;
      const hasImage = !!product.image;
      const hasPrice = !!product.price;

      const missingFields: string[] = [];
      if (!hasTitle) missingFields.push("title");
      if (!hasImage) missingFields.push("image");
      if (!hasPrice) missingFields.push("price");

      const status = missingFields.length === 0 ? "success" : "partial";

      results.push({
        url,
        status,
        data: product,
        missingFields,
        duration,
        diagnostics: scraped.diagnostics,
      });
    } catch (error) {
      const duration = Date.now() - start;
      results.push({
        url,
        status: "blocked",
        error: error instanceof Error ? error.message : "Unknown error",
        data: null,
        duration,
      });
    }
  }

  return NextResponse.json({ results });
}

function isAccessFailure(scraped: Awaited<ReturnType<typeof scrapeProductDetailed>>): boolean {
  if (scraped.blocked || !scraped.product) return true;

  const warnings = scraped.diagnostics?.warnings ?? [];
  if (warnings.some((warning) => /blocked|placeholder|captcha|challenge/i.test(warning))) {
    return true;
  }

  const product = scraped.product;
  return !product.image && !product.price && !product.discount_price;
}
