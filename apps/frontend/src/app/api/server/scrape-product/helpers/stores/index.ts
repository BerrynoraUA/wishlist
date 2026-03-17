import { ScraperMethod } from "../types";
import { scrapeRozetka } from "./rozetka";
import { scrapeEpicentr } from "./epicentr";
import { scrapeFoxtrot } from "./foxtrot";
import { scrapeProm } from "./prom";
import { scrapeEbay } from "./ebay";
import { scrapeOLX } from "./olx";
import { scrapeAmazon } from "./amazon";
import { scrapeAliExpress } from "./aliexpress";

/**
 * Реєстр магазинів: домен → скрапер.
 * Ключ — підрядок домену, значення — функція-скрапер.
 */
const storeRegistry: { pattern: string; scraper: ScraperMethod }[] = [
  { pattern: "rozetka.com.ua", scraper: scrapeRozetka },
  { pattern: "epicentrk.ua", scraper: scrapeEpicentr },
  { pattern: "foxtrot.com.ua", scraper: scrapeFoxtrot },
  { pattern: "prom.ua", scraper: scrapeProm },
  { pattern: "ebay.", scraper: scrapeEbay },
  { pattern: "olx.ua", scraper: scrapeOLX },
  { pattern: "amazon.", scraper: scrapeAmazon },
  { pattern: "aliexpress.", scraper: scrapeAliExpress },
];

/**
 * Повертає скрапер для конкретного магазину за URL, або null якщо невідомий домен.
 */
export function getStoreScraper(url: string): ScraperMethod | null {
  const domain = new URL(url).hostname.toLowerCase();

  for (const entry of storeRegistry) {
    if (domain.includes(entry.pattern)) {
      return entry.scraper;
    }
  }

  return null;
}
