import { describe, expect, it } from "vitest";
import { parseProductHtml } from "../src/parsing";

function page(body: string, head = ""): string {
  return `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;
}

describe("JSON-LD extraction", () => {
  it("reads a plain Product with an Offer", () => {
    const html = page(
      "<h1>ignored</h1>",
      `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: "Trail Runner 3",
        description: "A shoe.",
        image: "https://cdn.example/shoe.jpg",
        offers: { "@type": "Offer", price: "129.99", priceCurrency: "EUR" },
      })}</script>`,
    );
    const { extraction, quality } = parseProductHtml(html, "https://shop.example/p/trail-runner-3");

    expect(extraction.product.title).toBe("Trail Runner 3");
    expect(extraction.product.price).toBe("129.99");
    expect(extraction.product.currency).toBe("EUR");
    expect(extraction.product.image).toBe("https://cdn.example/shoe.jpg");
    expect(extraction.sources.title).toBe("json_ld");
    expect(quality.accepted).toBe(true);
  });

  it("prefers the candidate whose url matches the requested path", () => {
    const other = {
      "@type": "Product",
      name: "Recommended item",
      url: "https://shop.example/p/other",
      offers: { price: "10", priceCurrency: "USD" },
    };
    const wanted = {
      "@type": "Product",
      name: "The one you asked for",
      url: "https://shop.example/p/wanted",
      offers: { price: "20", priceCurrency: "USD" },
    };
    const html = page(
      "",
      `<script type="application/ld+json">${JSON.stringify([other, wanted])}</script>`,
    );
    const { extraction } = parseProductHtml(html, "https://shop.example/p/wanted");
    expect(extraction.product.title).toBe("The one you asked for");
    expect(extraction.product.price).toBe("20");
  });

  it("walks @graph and keeps AggregateOffer ranges as a discount pair", () => {
    const html = page(
      "",
      `<script type="application/ld+json">${JSON.stringify({
        "@graph": [
          { "@type": "WebPage", name: "not a product" },
          {
            "@type": "Product",
            name: "Ranged item",
            image: ["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"],
            offers: {
              "@type": "AggregateOffer",
              lowPrice: "40",
              highPrice: "60",
              priceCurrency: "USD",
            },
          },
        ],
      })}</script>`,
    );
    const { extraction } = parseProductHtml(html, "https://shop.example/p/ranged");
    expect(extraction.product.title).toBe("Ranged item");
    expect(extraction.product.price).toBe("60");
    expect(extraction.product.discount_price).toBe("40");
    expect(extraction.product.has_discount).toBe(true);
    expect(extraction.product.image).toBe("https://cdn.example/a.jpg");
  });

  it("separates list price from sale price in priceSpecification", () => {
    const html = page(
      "",
      `<script type="application/ld+json">${JSON.stringify({
        "@type": "Product",
        name: "Spec priced",
        offers: {
          "@type": "Offer",
          priceCurrency: "GBP",
          priceSpecification: [
            { "@type": "ListPrice", price: "200" },
            { "@type": "SalePrice", price: "150" },
          ],
        },
      })}</script>`,
    );
    const { extraction } = parseProductHtml(html, "https://shop.example/p/spec");
    expect(extraction.product.price).toBe("200");
    expect(extraction.product.discount_price).toBe("150");
    expect(extraction.product.currency).toBe("GBP");
  });

  it("records malformed JSON-LD and falls through to meta tags", () => {
    const html = page(
      "",
      `<script type="application/ld+json">{ not json }</script>
       <meta property="og:title" content="Meta fallback" />
       <meta property="og:image" content="https://cdn.example/m.jpg" />
       <meta property="product:price:amount" content="15.00" />
       <meta property="product:price:currency" content="USD" />`,
    );
    const { extraction } = parseProductHtml(html, "https://shop.example/p/meta");
    expect(extraction.product.title).toBe("Meta fallback");
    expect(extraction.product.price).toBe("15");
    expect(extraction.sources.title).toBe("meta_dom");
    expect(extraction.warnings).toContain("malformed_json_ld");
  });
});

describe("meta + DOM extraction", () => {
  it("pairs an old price with the current price", () => {
    const html = page(
      `<h1 itemprop="name">DOM Product</h1>
       <span class="current-price">$80.00</span>
       <del>$100.00</del>`,
      `<meta name="description" content="Described." />`,
    );
    const { extraction } = parseProductHtml(html, "https://shop.example/p/dom");
    expect(extraction.product.title).toBe("DOM Product");
    expect(extraction.product.price).toBe("100");
    expect(extraction.product.discount_price).toBe("80");
    expect(extraction.product.has_discount).toBe(true);
    expect(extraction.product.currency).toBe("USD");
  });

  it("is case-insensitive on meta property names", () => {
    const html = page("", `<meta PROPERTY="OG:TITLE" content="Shouty meta" />`);
    const { extraction } = parseProductHtml(html, "https://shop.example/p/x");
    expect(extraction.product.title).toBe("Shouty meta");
  });
});

describe("regex tier", () => {
  it("only sweeps for a bare price once a title and image exist", () => {
    const withoutImage = page(
      "",
      `<meta property="og:title" content="No image here" />
      <div>price: 42.00</div>`,
    );
    expect(
      parseProductHtml(withoutImage, "https://shop.example/p/a").extraction.product.price,
    ).toBeNull();
  });
});

describe("store profiles", () => {
  it("applies the eBay profile, image upgrade and title source", () => {
    const html = page(
      `<h1 class="x-item-title__mainTitle"><span>Vintage Camera</span></h1>
       <div class="x-price-primary"><span class="ux-textspans">US $249.95</span></div>
       <span class="ux-textspans--STRIKETHROUGH">US $299.95</span>`,
      `<meta property="og:image" content="https://i.ebayimg.com/images/g/abc/s-l500.jpg" />
       <meta itemprop="priceCurrency" content="USD" />`,
    );
    const { extraction } = parseProductHtml(html, "https://www.ebay.com/itm/123456789");
    expect(extraction.product.title).toBe("Vintage Camera");
    expect(extraction.product.price).toBe("299.95");
    expect(extraction.product.discount_price).toBe("249.95");
    expect(extraction.product.image).toBe("https://i.ebayimg.com/images/g/abc/s-l1600.jpg");
    expect(extraction.sources.title).toBe("store:ebay");
  });

  it("strips the storefront suffix via title_cleanup", () => {
    const html = page(
      "",
      `<meta property="og:title" content="Bat Grip | SidelineSwap Store" />
      <meta property="og:image" content="https://cdn.sidelineswap.com/a.jpg" />`,
    );
    const { extraction } = parseProductHtml(html, "https://sidelineswap.com/gear/1");
    expect(extraction.product.title).toBe("Bat Grip");
  });

  it("blocks a profile page whose title is a known interstitial", () => {
    const html = page("<h1>Access Denied</h1>", "");
    const { extraction, quality } = parseProductHtml(html, "https://www.overstock.com/p/1");
    expect(extraction.warnings).toContain("overstock_blocked_page");
    expect(quality.accepted).toBe(false);
  });

  it("falls back to the profile regex when the DOM selector misses", () => {
    const html = page(
      "<h1>Trendy Shirt</h1>",
      `<meta property="og:title" content="Trendy Shirt - Trendyol" />
       <meta property="og:image" content="https://cdn.trendyol.com/a.jpg" />
       <script>window.state = {"product_discounted_price": 149.90, "product_original_price": 299.90};</script>`,
    );
    const { extraction } = parseProductHtml(html, "https://www.trendyol.com/p/shirt-123");
    expect(extraction.product.title).toBe("Trendy Shirt");
    expect(extraction.product.price).toBe("299.9");
    expect(extraction.product.discount_price).toBe("149.9");
    expect(extraction.product.currency).toBe("TRY");
  });
});

describe("complex extractors", () => {
  it("reads the Amazon buybox price and upgrades the image", () => {
    const html = page(
      `<span id="productTitle">Amazon.com: Wireless Mouse : Electronics</span>
       <div id="corePrice_feature_div">
         <span class="a-price"><span class="a-offscreen">$24.99</span></span>
         <span class="a-text-price"><span class="a-offscreen">$34.99</span></span>
       </div>
       <img id="landingImage" data-old-hires="https://m.media-amazon.com/images/I/abc._SX679_.jpg" />`,
    );
    const { extraction } = parseProductHtml(html, "https://www.amazon.com/dp/B00TEST");
    expect(extraction.product.title).toBe("Wireless Mouse");
    expect(extraction.product.price).toBe("34.99");
    expect(extraction.product.discount_price).toBe("24.99");
    expect(extraction.product.currency).toBe("USD");
    expect(extraction.product.image).toBe(
      "https://m.media-amazon.com/images/I/abc._AC_SL1500_.jpg",
    );
    expect(extraction.sources.price).toBe("store:amazon");
  });

  it("finds the Amazon gallery image on the mobile layout", () => {
    // Mobile Amazon ships no og:image and no #landingImage.
    const html = page(
      `<span id="productTitle">Wireless Mouse</span>
       <div id="corePrice_feature_div"><span class="a-price"><span class="a-offscreen">$24.99</span></span></div>
       <div id="main-image-container">
         <img data-a-dynamic-image='{"https://m.media-amazon.com/images/I/abc._SX679_.jpg":[679,679],"https://m.media-amazon.com/images/I/abc._SX425_.jpg":[425,425]}' src="data:image/gif;base64,R0lGOD" />
       </div>`,
    );
    const { extraction } = parseProductHtml(html, "https://www.amazon.com/dp/B00TEST");
    expect(extraction.product.image).toBe(
      "https://m.media-amazon.com/images/I/abc._AC_SL1500_.jpg",
    );
  });

  it("keeps the foxtrot discount end date", () => {
    const html = page(
      `<h1>Холодильник</h1>
       <div data-product-price-main><data value="19999">19 999 ₴</data></div>
       <div data-product-price-old><data value="24999">24 999 ₴</data></div>
       <meta itemprop="priceValidUntil" content="2026-09-01T00:00:00Z" />
       <div class="product-gallery"><img src="https://cdn.foxtrot.com.ua/a.jpg" /></div>`,
    );
    const { extraction } = parseProductHtml(html, "https://www.foxtrot.com.ua/uk/shop/item.html");
    expect(extraction.product.price).toBe("24999");
    expect(extraction.product.discount_price).toBe("19999");
    expect(extraction.product.discount_end_date).toBe("2026-09-01");
    expect(extraction.product.currency).toBe("UAH");
  });

  it("marks target fields do_not_merge when no price was found", () => {
    const html = page(
      "",
      `<meta property="og:title" content="Target Item" />
      <meta property="og:image" content="https://target.scene7.com/a.jpg" />`,
    );
    const { extraction } = parseProductHtml(html, "https://www.target.com/p/thing/-/A-123");
    expect(extraction.product.price).toBeNull();
    expect(extraction.product.currency).toBeNull();
    expect(extraction.warnings).toContain("do_not_merge:price");
  });
});

describe("placeholder scrubbing", () => {
  it("wipes an AliExpress interstitial page", () => {
    const html = page(
      "",
      `<meta property="og:title" content="AliExpress" />
      <meta property="og:image" content="https://ae01.alicdn.com/logo.png" />`,
    );
    const { extraction, quality } = parseProductHtml(
      html,
      "https://www.aliexpress.com/item/100500.html",
    );
    expect(extraction.product.title).toBeNull();
    expect(extraction.product.image).toBeNull();
    expect(extraction.warnings).toContain("aliexpress_non_product_page");
    expect(quality.accepted).toBe(false);
  });
});

describe("quality scoring", () => {
  it("adds the cross-source confirmation bonus", () => {
    const html = page(
      "",
      `<script type="application/ld+json">${JSON.stringify({
        "@type": "Product",
        name: "Confirmed",
        offers: { price: "10", priceCurrency: "USD" },
      })}</script>
      <meta property="og:image" content="https://cdn.example/a.jpg" />
      <meta name="description" content="A description." />`,
    );
    const { quality } = parseProductHtml(html, "https://shop.example/p/confirmed");
    // 25 title + 30 price + 10 currency + 20 image + 5 description + 10 bonus
    expect(quality.score).toBe(100);
    expect(quality.accepted).toBe(true);
  });

  it("rejects a page with only a blocked title", () => {
    const html = page("<h1>Just a moment...</h1>", "");
    const { quality } = parseProductHtml(html, "https://shop.example/p/blocked");
    expect(quality.accepted).toBe(false);
  });
});
