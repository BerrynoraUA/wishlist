import { ScraperMethod } from "../types";
import { scrapeWithJSONLD } from "./json-ld";
import { scrapeWithCheerio } from "./cheerio";
import { scrapeWithRegex } from "./regex";

/**
 * Ланцюжок універсальних скраперів (від найспецифічнішого до найзагальнішого).
 */
export const genericScrapers: ScraperMethod[] = [
  scrapeWithJSONLD,
  scrapeWithCheerio,
  scrapeWithRegex,
];
