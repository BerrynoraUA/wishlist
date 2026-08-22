import { type ClientScrapeOutcome, scrapeProductOnDevice } from "@/lib/scraper/client-scraper";
import { SHOWCASE_ENABLED } from "@/lib/showcase/showcase-control";
import { SHOWCASE_SCRAPED_PRODUCT } from "@wishlist/backend/supabase/showcase/constants";

export type ScrapedProduct = {
  title: string | null;
  description: string | null;
  image: string | null;
  price: string | null;
  discount_price: string | null;
  has_discount: boolean;
  discount_end_date: string | null;
  currency: string | null;
};

const WEB_APP_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? "https://wishlane.net").replace(/\/$/, "");

function getErrorMessage(data: unknown) {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof data.error === "string" &&
    data.error.trim()
  ) {
    return data.error;
  }

  return "Could not fetch product data";
}

function normalizeProduct(product: Partial<ScrapedProduct>): ScrapedProduct {
  return {
    title: product.title ?? null,
    description: product.description ?? null,
    image: product.image ?? null,
    price: product.price ?? null,
    discount_price: product.discount_price ?? null,
    has_discount: product.has_discount ?? false,
    discount_end_date: product.discount_end_date ?? null,
    currency: product.currency ?? null,
  };
}

async function scrapeProductOnServer(url: string): Promise<ScrapedProduct> {
  const response = await fetch(`${WEB_APP_URL}/api/server/scrape-product`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, source: "add-item" }),
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(data));
  }

  return normalizeProduct(
    data && typeof data === "object" ? (data as Partial<ScrapedProduct>) : {},
  );
}

/** Scrapes on the device first, falling back to the server silently. */
export async function scrapeProductLink(url: string): Promise<ScrapedProduct> {
  // Captures run with no network and no scraper service, so the showcase build answers
  // the lookup from the same fixtures the rest of the run uses. The sheet, its loading
  // state and every field it fills are the production ones.
  if (SHOWCASE_ENABLED) return normalizeProduct(SHOWCASE_SCRAPED_PRODUCT);

  let clientOutcome: ClientScrapeOutcome | null = null;
  try {
    clientOutcome = await scrapeProductOnDevice(url);
  } catch {
    clientOutcome = null;
  }

  if (clientOutcome?.accepted) {
    return normalizeProduct(clientOutcome.product);
  }

  try {
    return await scrapeProductOnServer(url);
  } catch (error) {
    // A partial on-device result still beats showing the user nothing.
    if (clientOutcome && (clientOutcome.product.title || clientOutcome.product.image)) {
      return normalizeProduct(clientOutcome.product);
    }
    throw error;
  }
}
