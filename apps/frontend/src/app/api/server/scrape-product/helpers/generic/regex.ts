import { ProductData, emptyProduct } from "../types";
import {
  extractMetaTagRegex,
  extractTagRegex,
  extractPriceRegex,
} from "../utils";

/**
 * Regex скрапер — запасний варіант, працює без DOM-парсера.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function scrapeWithRegex(html: string, _url: string): ProductData {
  try {
    return {
      title:
        extractMetaTagRegex(html, "og:title") || extractTagRegex(html, "h1"),
      description:
        extractMetaTagRegex(html, "og:description") ||
        extractMetaTagRegex(html, "description"),
      image: extractMetaTagRegex(html, "og:image"),
      price: extractPriceRegex(html),
      discount_price: null,
      has_discount: false,
      discount_end_date: null,
    };
  } catch (error) {
    console.error("Regex scraping failed:", error);
    return emptyProduct();
  }
}
