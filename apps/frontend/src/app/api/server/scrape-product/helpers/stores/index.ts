import { ScraperMethod, AsyncScraperMethod } from "../types";
import { scrapeRozetka } from "./rozetka";
import { scrapeEpicentr } from "./epicentr";
import { scrapeFoxtrot } from "./foxtrot";
import { scrapeProm } from "./prom";
import { scrapeEbay } from "./ebay";
import { scrapeOLX } from "./olx";
import { scrapeAmazon } from "./amazon";
import { scrapeAliExpress } from "./aliexpress";
import { scrapeAvrora } from "./avrora";
import { scrapeOctopus } from "./octopus";
import { scrapeHoroshop, scrapeLelekan } from "./horoshop";
import { scrapeTarget } from "./target";
import { scrapeTrendyol } from "./trendyol";
import { scrapeHepsiburada } from "./hepsiburada";
import { scrapeN11 } from "./n11";
import { scrapeShopGoodwill } from "./shopgoodwill";
import { scrapeAbebooks } from "./abebooks";
import { scrapeModaOperandi } from "./modaoperandi";
import { scrapeBandcamp } from "./bandcamp";
import { scrapeDBA } from "./dba";
import { scrapeGrailed } from "./grailed";
import { scrapeMiinto } from "./miinto";
import { scrapeFlipkart } from "./flipkart";
import { scrapeRubylane } from "./rubylane";
import { scrapeWildberries } from "./wildberries";
import { scrapeUaTao } from "./uatao";
import { scrapeZalando } from "./zalando";
import { scrapeStructuredMarketplace } from "./structured-marketplaces";

/**
 * Реєстр магазинів: домен → скрапер.
 * Ключ — підрядок домену, значення — функція-скрапер.
 * async — якщо true, скрапер повертає Promise (потрібно для SPA-сайтів з API).
 */
const storeRegistry: {
  pattern: string;
  scraper: ScraperMethod | AsyncScraperMethod;
  async?: boolean;
}[] = [
  { pattern: "lamoda.ru", scraper: scrapeStructuredMarketplace },
  { pattern: "lazada.", scraper: scrapeStructuredMarketplace },
  { pattern: "meesho.com", scraper: scrapeStructuredMarketplace },
  { pattern: "overstock.com", scraper: scrapeStructuredMarketplace },
  { pattern: "emag.", scraper: scrapeStructuredMarketplace },
  { pattern: "takealot.com", scraper: scrapeStructuredMarketplace },
  { pattern: "cdiscount.com", scraper: scrapeStructuredMarketplace },
  { pattern: "farfetch.com", scraper: scrapeStructuredMarketplace },
  { pattern: "rozetka.com.ua", scraper: scrapeRozetka },
  { pattern: "epicentrk.ua", scraper: scrapeEpicentr },
  { pattern: "foxtrot.com.ua", scraper: scrapeFoxtrot },
  { pattern: "prom.ua", scraper: scrapeProm },
  { pattern: "ebay.", scraper: scrapeEbay },
  { pattern: "olx.ua", scraper: scrapeOLX },
  { pattern: "amazon.", scraper: scrapeAmazon },
  { pattern: "aliexpress.", scraper: scrapeAliExpress },
  { pattern: "avrora.ua", scraper: scrapeAvrora },
  { pattern: "octopus.in.ua", scraper: scrapeOctopus },
  { pattern: "bujobox.com.ua", scraper: scrapeHoroshop },
  { pattern: "hobymonster.com.ua", scraper: scrapeHoroshop },
  { pattern: "leleka.camp", scraper: scrapeHoroshop },
  { pattern: "lelekan.com.ua", scraper: scrapeLelekan, async: true },
  { pattern: "target.com", scraper: scrapeTarget, async: true },
  { pattern: "trendyol.com", scraper: scrapeTrendyol },
  { pattern: "hepsiburada.com", scraper: scrapeHepsiburada },
  { pattern: "n11.com", scraper: scrapeN11 },
  { pattern: "shopgoodwill.com", scraper: scrapeShopGoodwill, async: true },
  { pattern: "abebooks.com", scraper: scrapeAbebooks },
  { pattern: "modaoperandi.com", scraper: scrapeModaOperandi },
  { pattern: "bandcamp.com", scraper: scrapeBandcamp },
  { pattern: "dba.dk", scraper: scrapeDBA },
  { pattern: "grailed.com", scraper: scrapeGrailed },
  { pattern: "miinto.com", scraper: scrapeMiinto },
  { pattern: "flipkart.com", scraper: scrapeFlipkart },
  { pattern: "rubylane.com", scraper: scrapeRubylane },
  { pattern: "wildberries.ru", scraper: scrapeWildberries, async: true },
  { pattern: "ua-tao.com", scraper: scrapeUaTao },
  { pattern: "zalando.", scraper: scrapeZalando },
];

/**
 * Повертає скрапер для конкретного магазину за URL, або null якщо невідомий домен.
 */
export function getStoreScraper(
  url: string,
): { scraper: ScraperMethod | AsyncScraperMethod; async: boolean } | null {
  const domain = new URL(url).hostname.toLowerCase();

  for (const entry of storeRegistry) {
    if (domain.includes(entry.pattern)) {
      return { scraper: entry.scraper, async: entry.async ?? false };
    }
  }

  return null;
}
