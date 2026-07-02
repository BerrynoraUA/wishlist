import { ProductData, ScraperMethod, emptyProduct } from "../types";
import { scrapeWithJSONLD } from "./json-ld";
import { scrapeWithCheerio } from "./cheerio";
import { scrapeWithRegex } from "./regex";
import { extractMetadata } from "./metascraper";

/**
 * Статичні універсальні скрапери (від найспецифічнішого до найзагальнішого).
 * Заповнюють поля, яких немає в метаданих — насамперед ціну/валюту/знижку,
 * які metascraper не витягує.
 */
const genericScrapers: ScraperMethod[] = [scrapeWithJSONLD, scrapeWithCheerio, scrapeWithRegex];

/**
 * Metadata-first generic extraction (Tier 1).
 *
 * metascraper reads OG/<meta> for the descriptive fields (title/description/
 * image); the JSON-LD / cheerio / regex extractors then fill any gaps and
 * supply price/currency/discount, which metascraper does not cover.
 */
export async function extractGenericProduct(html: string, url: string): Promise<ProductData> {
  const product = emptyProduct();

  const meta = await extractMetadata(html, url);
  product.title = meta.title;
  product.description = meta.description;
  product.image = meta.image;

  for (const scraper of genericScrapers) {
    const result = scraper(html, url);

    if (!product.title && result.title) product.title = result.title;
    if (!product.description && result.description) product.description = result.description;
    if (!product.image && result.image) product.image = result.image;
    if (!product.price && result.price) product.price = result.price;
    if (!product.discount_price && result.discount_price)
      product.discount_price = result.discount_price;
    if (!product.has_discount && result.has_discount) product.has_discount = result.has_discount;
    if (!product.discount_end_date && result.discount_end_date)
      product.discount_end_date = result.discount_end_date;
    if (!product.currency && result.currency) product.currency = result.currency;

    if (product.title && product.description && product.image && product.price) {
      break;
    }
  }

  return product;
}
