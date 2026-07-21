import { ProductData, emptyProduct } from "../types";
import { extractCurrency, extractMetaTagRegex, extractTagRegex, extractPriceRegex } from "../utils";

/**
 * Regex скрапер — запасний варіант, працює без DOM-парсера.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function scrapeWithRegex(html: string, url: string): ProductData {
  try {
    const title = extractMetaTagRegex(html, "og:title") || extractTagRegex(html, "h1");
    const image = extractMetaTagRegex(html, "og:image");
    return {
      title,
      description:
        extractMetaTagRegex(html, "og:description") || extractMetaTagRegex(html, "description"),
      image,
      // Avoid analytics/login/challenge numbers such as Cdiscount's "1" and
      // Farfetch's "2". Broad regex price extraction requires product identity.
      price: title && image ? extractPriceRegex(html) : null,
      discount_price: null,
      has_discount: false,
      discount_end_date: null,
      currency: extractCurrency(null, html, url),
    };
  } catch (error) {
    console.error("Regex scraping failed:", error);
    return emptyProduct();
  }
}
