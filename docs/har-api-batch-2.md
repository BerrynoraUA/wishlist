# HAR API integration — batch 2

Analyzed HAR files:

- `www.lamoda.ru.har`
- `www.otto.de.har`
- `www.rubylane.com.har`
- `www.worten.pt.har`

## Result

None of these recordings contains a reusable item-detail API that returns the requested product's
title, image and current price. No API-first adapters were added for this batch: using one of the
supplemental endpoints below as a product endpoint would return incomplete or unrelated data.

All four stores remain on the regular Scrapling cascade and structured-page parsing.

## Findings

### Lamoda

The product SKU can be extracted from the URL (`AD002EMIYPI1` in the recording). The page calls
several unauthenticated storefront APIs, including:

```http
GET /api/v1/product/reviews_info?sku={sku}&with_related=true
GET /api/v1/product/recommendations?sku={sku}&...
GET /goapi/seo/?url={productPath}
```

The recommendations response contains full cards for recommended products, not the requested
product. The reviews and SEO endpoints do not provide a complete item card. The main product is
therefore still sourced from the initial page document.

### OTTO

The page exposes a numeric product ID and variation ID and calls several PDP services:

```http
GET /up-teaserui/gateway/articleTeaserContext?variationId={variationId}
GET /up-teaserui/gateway/pointsInfoBannerContext?variationId={variationId}
GET /auction-otter/cinema/sponsored-products?variationId={variationId}
```

These endpoints return membership UI, bonus information and sponsored products. They do not return
the requested product. OTTO's documented marketplace APIs are authenticated seller/partner APIs and
are not the consumer storefront contract captured by this HAR.

### Ruby Lane

The requested item is present in the initial HTML document as Product JSON-LD. The only same-site
asynchronous requests in the recording are HTML widgets and similar-item fragments:

```http
GET /ni/ajax/similaritems.tcl?...
GET /ni/ajax/tp_widget.tcl?...
```

They are session-shaped HTML endpoints and do not replace item retrieval. Ruby Lane remains an SSR
JSON-LD source.

### Worten

The HAR contains one malformed DevTools stack-frame value, but its request records and initial
document remain inspectable. Product data is embedded in the Nuxt/SSR document. Supplemental calls
include:

```http
GET /worten-api/products/technical-specifications?id={internalProductUuid}
GET /worten-api/brands?brand={brand}
GET /worten-api/cms/solve-offer-badges-batch?offerId={offerId}&...
```

The technical-specifications endpoint needs an internal UUID that is supplied by the SSR payload
and does not return the core title, image and offer. The brand and badge endpoints are also
supplemental. Worten therefore remains on SSR embedded-state/JSON-LD parsing.
