import { ProductData, emptyProduct } from "../types";

/**
 * JSON-LD скрапер — найнадійніший для структурованих даних про товар.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function scrapeWithJSONLD(html: string, _url: string): ProductData {
  try {
    const jsonLdMatch = html.match(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    );

    if (!jsonLdMatch) return emptyProduct();

    for (const script of jsonLdMatch) {
      const jsonContent = script
        .replace(/<script[^>]*type=["']application\/ld\+json["'][^>]*>/i, "")
        .replace(/<\/script>/i, "");

      try {
        const data = JSON.parse(jsonContent);
        const result = extractProductFromJSONLD(data);
        if (result) return result;
      } catch {
        continue;
      }
    }

    return emptyProduct();
  } catch (error) {
    console.error("JSON-LD scraping failed:", error);
    return emptyProduct();
  }
}

/**
 * Рекурсивне витягування Product з JSON-LD (@graph, priceSpecification, AggregateOffer)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractProductFromJSONLD(data: any): ProductData | null {
  if (!data || typeof data !== "object") return null;

  // Handle @graph structure (WordPress/WooCommerce, Shopify)
  if (data["@graph"]) {
    const graphItems = Array.isArray(data["@graph"])
      ? data["@graph"]
      : [data["@graph"]];
    for (const item of graphItems) {
      const result = extractProductFromJSONLD(item);
      if (result) return result;
    }
  }

  const items = Array.isArray(data) ? data : [data];

  for (const item of items) {
    const itemType = item["@type"];
    const isProduct =
      itemType === "Product" ||
      itemType === "http://schema.org/Product" ||
      (Array.isArray(itemType) && itemType.includes("Product"));

    if (!isProduct) continue;

    const offers = item.offers;
    let price: string | null = null;
    let discountPrice: string | null = null;
    let hasDiscount = false;
    let discountEndDate: string | null = null;

    if (offers) {
      const offersList = Array.isArray(offers) ? offers : [offers];

      for (const offer of offersList) {
        // --- AggregateOffer ---
        if (
          offer["@type"] === "AggregateOffer" ||
          offer["@type"] === "http://schema.org/AggregateOffer"
        ) {
          if (offer.lowPrice != null) {
            if (
              offer.highPrice != null &&
              String(offer.highPrice) !== String(offer.lowPrice)
            ) {
              price = String(offer.highPrice);
              discountPrice = String(offer.lowPrice);
              hasDiscount = true;
            } else {
              price = String(offer.lowPrice);
            }
          } else if (offer.price != null) {
            price = String(offer.price);
          }
          if (offer.priceValidUntil) discountEndDate = offer.priceValidUntil;
          break;
        }

        // --- PriceSpecification ---
        if (offer.priceSpecification) {
          const specs = Array.isArray(offer.priceSpecification)
            ? offer.priceSpecification
            : [offer.priceSpecification];

          let listPrice: string | null = null;
          let salePrice: string | null = null;

          for (const spec of specs) {
            const specPrice = spec.price ?? spec.value;
            if (specPrice == null) continue;

            const specType = (spec["@type"] || spec.priceType || "").toString();

            if (
              /ListPrice|MSRP|RegularPrice|SuggestedRetailPrice/i.test(
                specType,
              ) ||
              /list|regular|original|retail|msrp|rrp|base|normal/i.test(
                specType,
              )
            ) {
              listPrice = String(specPrice);
            } else if (
              /SalePrice|MinimumAdvertisedPrice|DiscountPrice|PromotionalPrice/i.test(
                specType,
              ) ||
              /sale|special|offer|discount|deal|promo|reduced|clearance/i.test(
                specType,
              )
            ) {
              salePrice = String(specPrice);
            } else if (!salePrice) {
              salePrice = String(specPrice);
            }

            if (spec.validThrough || spec.priceValidUntil) {
              discountEndDate =
                discountEndDate || spec.validThrough || spec.priceValidUntil;
            }
          }

          if (listPrice && salePrice && listPrice !== salePrice) {
            price = listPrice;
            discountPrice = salePrice;
            hasDiscount = true;
          } else {
            price = salePrice || listPrice;
          }
        }

        // --- Standard offer price ---
        const offerPrice = offer.price ?? offer.lowPrice;
        if (!price && offerPrice != null) {
          price = String(offerPrice);
        }

        // --- highPrice vs price comparison ---
        if (!hasDiscount && offer.price != null && offer.highPrice != null) {
          const p = parseFloat(String(offer.price));
          const hp = parseFloat(String(offer.highPrice));
          if (!isNaN(p) && !isNaN(hp) && p !== hp) {
            price = String(Math.max(p, hp));
            discountPrice = String(Math.min(p, hp));
            hasDiscount = true;
          }
        }

        // --- Non-standard salePrice property ---
        if (!hasDiscount && offer.salePrice != null && offerPrice != null) {
          const sp = parseFloat(String(offer.salePrice));
          const op = parseFloat(String(offerPrice));
          if (!isNaN(sp) && !isNaN(op) && sp !== op) {
            price = String(Math.max(sp, op));
            discountPrice = String(Math.min(sp, op));
            hasDiscount = true;
          }
        }

        if (offer.priceValidUntil) {
          discountEndDate = discountEndDate || offer.priceValidUntil;
        }

        if (price) break;
      }
    }

    // Validate: ensure price > discountPrice
    if (hasDiscount && price && discountPrice) {
      const priceNum = parseFloat(String(price).replace(/[^\d.]/g, ""));
      const discountNum = parseFloat(
        String(discountPrice).replace(/[^\d.]/g, ""),
      );
      if (!isNaN(priceNum) && !isNaN(discountNum)) {
        if (discountNum > priceNum) {
          [price, discountPrice] = [discountPrice, price];
        } else if (discountNum === priceNum) {
          discountPrice = null;
          hasDiscount = false;
        }
      }
    }

    return {
      title: item.name || null,
      description: item.description || null,
      image: (Array.isArray(item.image) ? item.image[0] : item.image) || null,
      price: price ? String(price) : null,
      discount_price: discountPrice ? String(discountPrice) : null,
      has_discount: hasDiscount,
      discount_end_date: discountEndDate,
    };
  }

  return null;
}
