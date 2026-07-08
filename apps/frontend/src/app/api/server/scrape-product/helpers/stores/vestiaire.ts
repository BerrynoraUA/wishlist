import { scrapeWithJSONLD } from "../generic/json-ld";
import type { ProductData } from "../types";

const GENERIC_TITLES = new Set(["jacket", "dress", "shirt", "shoes", "bag"]);

export function scrapeVestiaire(html: string, url: string): ProductData {
  const product = scrapeWithJSONLD(html, url);
  if (!product.title || GENERIC_TITLES.has(product.title.trim().toLowerCase())) {
    product.title = titleFromProductUrl(url) ?? product.title;
  }
  return product;
}

function titleFromProductUrl(url: string): string | null {
  const slug = new URL(url).pathname.split("/").filter(Boolean).at(-1);
  if (!slug) return null;

  const words = slug
    .replace(/-\d+\.shtml$/i, "")
    .split("-")
    .filter(Boolean)
    .map((word) => (word.toLowerCase() === "hermes" ? "Hermès" : word.toLowerCase()));
  if (!words.length) return null;

  words[0] = `${words[0][0].toUpperCase()}${words[0].slice(1)}`;
  return words.join(" ");
}
