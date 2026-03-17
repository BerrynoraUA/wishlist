/**
 * Content script — extracts product metadata from the current page.
 *
 * Strategy (ordered by reliability):
 *   1. JSON-LD structured data (schema.org/Product)
 *   2. Open Graph / Twitter meta tags
 *   3. Domain-specific selectors (Amazon, eBay, etc.)
 *   4. Generic heuristics (largest heading + first price-like text)
 */

(() => {
  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */

  /** Return the text content of the first matching selector, or null. */
  function text(selector) {
    const el = document.querySelector(selector);
    return el ? el.textContent.trim() : null;
  }

  /** Return a meta tag's content attribute value. */
  function meta(name) {
    const el =
      document.querySelector(`meta[property="${name}"]`) ||
      document.querySelector(`meta[name="${name}"]`);
    return el ? el.getAttribute("content")?.trim() || null : null;
  }

  /** Resolve a possibly-relative URL against the page origin. */
  function resolveUrl(url) {
    if (!url) return null;
    try {
      return new URL(url, location.origin).href;
    } catch {
      return null;
    }
  }

  /** Extract the first price-like string from text. */
  function extractPrice(str) {
    if (!str) return null;
    const m = str.match(
      /(?:[\$€£¥₴₽]\s*[\d,.]+|[\d,.]+\s*(?:USD|EUR|GBP|UAH|грн))/i,
    );
    return m ? m[0].trim() : null;
  }

  /* ------------------------------------------------------------------ */
  /*  1. JSON-LD                                                         */
  /* ------------------------------------------------------------------ */

  function fromJsonLd() {
    const scripts = document.querySelectorAll(
      'script[type="application/ld+json"]',
    );

    for (const script of scripts) {
      try {
        let data = JSON.parse(script.textContent);

        // Can be an array or wrapped in @graph
        if (Array.isArray(data))
          data = data.find((d) => d["@type"] === "Product") || data[0];
        if (data?.["@graph"])
          data = data["@graph"].find((d) => d["@type"] === "Product");
        if (!data || data["@type"] !== "Product") continue;

        const offers = Array.isArray(data.offers)
          ? data.offers[0]
          : data.offers;

        return {
          title: data.name || null,
          description: data.description || null,
          image: resolveUrl(
            Array.isArray(data.image) ? data.image[0] : data.image,
          ),
          price: offers?.price
            ? `${offers.priceCurrency || ""} ${offers.price}`.trim()
            : null,
        };
      } catch {
        /* malformed JSON — skip */
      }
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /*  2. Open Graph / Twitter meta tags                                  */
  /* ------------------------------------------------------------------ */

  function fromMetaTags() {
    const title =
      meta("og:title") || meta("twitter:title") || document.title || null;
    const description =
      meta("og:description") || meta("twitter:description") || null;
    const image = resolveUrl(
      meta("og:image") || meta("twitter:image:src") || meta("twitter:image"),
    );
    const price =
      meta("product:price:amount") || meta("og:price:amount") || null;
    const currency =
      meta("product:price:currency") || meta("og:price:currency") || "";

    if (!title && !image) return null;

    return {
      title,
      description,
      image,
      price: price ? `${currency} ${price}`.trim() : null,
    };
  }

  /* ------------------------------------------------------------------ */
  /*  3. Domain-specific selectors                                       */
  /* ------------------------------------------------------------------ */

  const DOMAIN_RULES = [
    {
      // Amazon
      match: /amazon\.(com|co\.uk|de|fr|ca|com\.au|co\.jp)/,
      extract: () => ({
        title: text("#productTitle"),
        description: text("#feature-bullets"),
        image:
          document.querySelector("#landingImage")?.getAttribute("src") ||
          document.querySelector("#imgBlkFront")?.getAttribute("src") ||
          null,
        price:
          text(".a-price .a-offscreen") ||
          text("#priceblock_ourprice") ||
          text("#priceblock_dealprice") ||
          text(".a-price-whole") ||
          null,
      }),
    },
    {
      // eBay
      match: /ebay\.(com|co\.uk|de|fr|ca|com\.au)/,
      extract: () => ({
        title: text(".x-item-title__mainTitle"),
        description: meta("og:description"),
        image:
          document
            .querySelector(".ux-image-carousel-item img")
            ?.getAttribute("src") || meta("og:image"),
        price: text(".x-price-primary span") || null,
      }),
    },
    {
      // Walmart
      match: /walmart\.com/,
      extract: () => ({
        title: text("[itemprop='name']") || text("h1"),
        description: meta("og:description"),
        image: meta("og:image"),
        price:
          text("[itemprop='price']") ||
          text("[data-testid='price-wrap']") ||
          null,
      }),
    },
    {
      // AliExpress
      match: /aliexpress\.(com|us)/,
      extract: () => ({
        title: text("h1") || meta("og:title"),
        description: meta("og:description"),
        image: meta("og:image"),
        price: text(".product-price-value") || null,
      }),
    },
    {
      // Etsy
      match: /etsy\.com/,
      extract: () => ({
        title: text("[data-buy-box-listing-title]") || text("h1"),
        description: meta("og:description"),
        image: meta("og:image"),
        price: text("[data-appears-component-name='price'] p") || null,
      }),
    },
  ];

  function fromDomainRules() {
    const host = location.hostname;
    for (const rule of DOMAIN_RULES) {
      if (rule.match.test(host)) {
        try {
          const data = rule.extract();
          if (data.title || data.image) return data;
        } catch {
          /* selector failed */
        }
      }
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /*  4. Generic heuristics                                              */
  /* ------------------------------------------------------------------ */

  function fromHeuristics() {
    // Best-guess title: largest heading
    const headings = document.querySelectorAll("h1, h2");
    let title = null;
    for (const h of headings) {
      const t = h.textContent.trim();
      if (t.length > 5) {
        title = t;
        break;
      }
    }

    // Image — largest visible image
    let image = null;
    let maxArea = 0;
    document.querySelectorAll("img[src]").forEach((img) => {
      const area = img.naturalWidth * img.naturalHeight;
      if (area > maxArea && img.naturalWidth > 150) {
        maxArea = area;
        image = img.src;
      }
    });

    // Price — first price-like string on page
    const priceEl =
      document.querySelector("[class*='price' i]") ||
      document.querySelector("[id*='price' i]");
    const price = extractPrice(priceEl?.textContent || "");

    if (!title && !image) return null;
    return { title, description: meta("description"), image, price };
  }

  /* ------------------------------------------------------------------ */
  /*  Orchestrator                                                       */
  /* ------------------------------------------------------------------ */

  function extractProduct() {
    const strategies = [
      fromJsonLd,
      fromDomainRules,
      fromMetaTags,
      fromHeuristics,
    ];
    const product = {
      title: null,
      description: null,
      image: null,
      price: null,
    };

    for (const strategy of strategies) {
      const result = strategy();
      if (!result) continue;

      if (!product.title && result.title) product.title = result.title;
      if (!product.description && result.description)
        product.description = result.description;
      if (!product.image && result.image) product.image = result.image;
      if (!product.price && result.price) product.price = result.price;

      if (product.title && product.image && product.price) break;
    }

    // Always include the page URL
    product.url = location.href;

    return product;
  }

  /* ------------------------------------------------------------------ */
  /*  Message listener                                                    */
  /* ------------------------------------------------------------------ */

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "EXTRACT_PRODUCT") {
      const data = extractProduct();
      sendResponse(data);
    }
    return true; // keep channel open for async
  });
})();
