# HAR API integration — batch 1

Analyzed HAR files:

- `allegro.pl.har`
- `www.bestbuy.ca.har`
- `www.digitec.ch.har`
- `www.fnac.com.har`
- `www.galaxus.ch.har`

## Implemented

### Best Buy Canada

Product ID is the final numeric segment of the product URL.

```http
GET https://www.bestbuy.ca/api/v1/catalog/query?ids={productId}&lang=en-CA
```

The response provides name, description, regular/sale prices, sale end date and images. No
authorization or browser cookie was present in the HAR request.

### Digitec and Galaxus

Both storefronts use the same GraphQL operation with different portal IDs:

```http
POST https://www.{domain}/api/graphql/get-products-with-offer-default
```

- Digitec portal: `25`
- Galaxus portal: `22`
- Product ID: final numeric segment of the product URL

The request returns product name, images, current price, crossed-out price and currency. A plain
server request received 403, so the adapter escalates from Next to Python HTTP with Chrome TLS
impersonation and then to the configured HTTP proxy.

## Not implemented as API

### Allegro

The HAR contains preferences, cart, analytics and anti-bot requests, but no product-detail XHR or
Fetch request. Product data arrives in the initial SSR document. An internal item endpoint cannot
be reconstructed from this HAR without inventing a contract, so Allegro remains on the regular
parsing pipeline.

### Fnac

The HAR contains Akamai sensor submissions and `/Recommendations`, but no JSON item-detail API.
The recommendation response is HTML and does not replace product retrieval. Fnac therefore remains
on the regular parsing pipeline.
