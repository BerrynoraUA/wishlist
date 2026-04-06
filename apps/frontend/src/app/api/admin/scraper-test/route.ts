import { NextResponse } from "next/server";
import { scrapeProduct } from "@/app/api/server/scrape-product/route";

export const maxDuration = 300; 

export async function POST(request: Request) {
  const { urls } = (await request.json()) as { urls: string[] };

  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json(
      { error: "Missing or empty 'urls' array" },
      { status: 400 },
    );
  }

  const results = [];

  for (const url of urls) {
    const start = Date.now();
    try {
      const product = await scrapeProduct(url);
      const duration = Date.now() - start;

      if (!product) {
        results.push({ url, status: "failed", error: "No data extracted", data: null, duration });
        continue;
      }

      // Вважаємо success якщо title + image + price заскрапились
      const hasTitle = !!product.title;
      const hasImage = !!product.image;
      const hasPrice = !!product.price;

      const missingFields: string[] = [];
      if (!hasTitle) missingFields.push("title");
      if (!hasImage) missingFields.push("image");
      if (!hasPrice) missingFields.push("price");

      const status = missingFields.length === 0 ? "success" : "partial";

      results.push({ url, status, data: product, missingFields, duration });
    } catch (error) {
      const duration = Date.now() - start;
      results.push({
        url,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        data: null,
        duration,
      });
    }
  }

  return NextResponse.json({ results });
}
