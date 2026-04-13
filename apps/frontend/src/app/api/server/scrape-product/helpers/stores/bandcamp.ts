import * as cheerio from "cheerio";
import { ProductData } from "../types";
import { extractNumericPrice } from "../utils";

/**
 * Bandcamp — music platform (albums, tracks, merch).
 * Rich JSON-LD (MusicAlbum) with pricing, description, and artwork.
 * OG tags have minimal data; prefer LD+JSON.
 */
export function scrapeBandcamp(html: string, url: string): ProductData {
  const $ = cheerio.load(html);

  let title: string | null = null;
  let description: string | null = null;
  let image: string | null = null;
  let currentPrice: string | null = null;
  let currency: string | null = null;

  // --- Parse JSON-LD MusicAlbum ---
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      if (data["@type"] !== "MusicAlbum" && data["@type"] !== "MusicRecording")
        return;

      // Title — album/track name without artist suffix
      if (data.name) title = data.name.trim();

      // Description — can start with PREVIEWS link, strip it
      if (data.description) {
        let desc = data.description.trim();
        // Remove "PREVIEWS: https://..." prefix line
        desc = desc.replace(/^PREVIEWS:\s*https?:\/\/\S+\s*/i, "").trim();
        if (desc) description = desc;
      }

      // Image — Bandcamp uses _N suffix: _1 (original), _10 (large), _5 (small)
      if (data.image) {
        image = typeof data.image === "string" ? data.image : null;
        // Ensure we get the large version (_10)
        if (image) {
          image = image.replace(/_\d+\.(\w+)$/, "_10.$1");
        }
      }

      // Offers — first release (digital) has the price
      const releases = data.albumRelease || [];
      for (const release of releases) {
        const offers = release.offers;
        if (!offers) continue;
        const offerList = Array.isArray(offers) ? offers : [offers];
        for (const offer of offerList) {
          if (offer.price != null) {
            currentPrice = extractNumericPrice(String(offer.price));
            if (offer.priceCurrency) currency = offer.priceCurrency;
            break;
          }
        }
        if (currentPrice) break;
      }
    } catch {
      /* ignore malformed JSON */
    }
  });

  // --- Fallbacks from OG meta ---
  if (!title) {
    let ogTitle = $('meta[property="og:title"]').attr("content")?.trim() || "";
    // Remove ", by Artist" suffix
    ogTitle = ogTitle.replace(/,\s*by\s+.+$/i, "").trim();
    title = ogTitle || null;
  }

  if (!description) {
    const ogDesc = $('meta[property="og:description"]').attr("content")?.trim();
    // Skip generic "N track album" descriptions
    if (ogDesc && !/^\d+ track album$/i.test(ogDesc)) {
      description = ogDesc;
    }
  }

  if (!image) {
    let ogImage =
      $('meta[property="og:image"]').attr("content")?.trim() || null;
    if (ogImage) {
      ogImage = ogImage.replace(/_\d+\.(\w+)$/, "_10.$1");
    }
    image = ogImage;
  }

  // Currency fallback
  if (!currency) {
    const currMatch = html.match(/"currency"\s*:\s*"([A-Z]{3})"/);
    if (currMatch) currency = currMatch[1];
  }

  // Price fallback from TralbumData
  if (!currentPrice) {
    const minPrice = html.match(/"minimum_price"\s*:\s*([\d.]+)/);
    if (minPrice) {
      currentPrice = extractNumericPrice(minPrice[1]);
    }
  }

  return {
    title: title || null,
    description: description || null,
    image: image || null,
    price: currentPrice,
    discount_price: null,
    has_discount: false,
    discount_end_date: null,
    currency: currency || null,
  };
}
