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

export async function scrapeProductLink(url: string): Promise<ScrapedProduct> {
  const response = await fetch(`${WEB_APP_URL}/api/server/scrape-product`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
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

  const product = data && typeof data === "object" ? (data as Partial<ScrapedProduct>) : {};

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
