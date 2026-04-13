import * as cheerio from "cheerio";
import { ProductData } from "../types";
import { extractNumericPrice, extractImage } from "../utils";

export function scrapeOctopus(html: string, url: string): ProductData {
  const $ = cheerio.load(html);

  // --- Title ---
  const title = $("h1.cathead").first().text().trim() || null;

  // --- Prices ---
  // Structure: <span class="normalprice">1 086<span class="currency">грн</span></span>
  //            <span class="oldprice">1120<span class="currency">грн</span></span>
  let currentPrice: string | null = null;
  let oldPrice: string | null = null;

  const normalEl = $(".normalprice").first();
  if (normalEl.length) {
    const clone = normalEl.clone();
    clone.find(".currency").remove();
    currentPrice = extractNumericPrice(clone.text());
  }

  const oldEl = $(".oldprice").first();
  if (oldEl.length) {
    const clone = oldEl.clone();
    clone.find(".currency").remove();
    oldPrice = extractNumericPrice(clone.text());
  }

  // Validate price order (old must be >= current)
  if (oldPrice && currentPrice) {
    const oldNum = parseFloat(oldPrice);
    const curNum = parseFloat(currentPrice);
    if (oldNum < curNum) {
      [oldPrice, currentPrice] = [currentPrice, oldPrice];
    }
    if (oldNum === curNum) {
      oldPrice = null;
    }
  }

  const hasDiscount = Boolean(oldPrice && currentPrice && oldPrice !== currentPrice);

  // --- Description ---
  let description: string | null = null;
  const descTab = $("#tab-description");
  if (descTab.length) {
    description = descTab.text().trim().replace(/\s+/g, " ") || null;
  }

  // --- Image ---
  const image = $('meta[property="og:image"]').attr("content") || extractImage($, url);

  return {
    title,
    description,
    image: image || null,
    price: hasDiscount ? oldPrice : currentPrice,
    discount_price: hasDiscount ? currentPrice : null,
    has_discount: hasDiscount,
    discount_end_date: null,
    currency: "UAH",
  };
}
