# API audit: 43 blocked marketplace domains

Audit date: 2026-07-05. Source: `scraper-test-2026-07-03T11-09-23-filtered.json`.

The audit used the real product URLs in the in-app browser without a proxy. “Structured page”
means that product data is available in JSON-LD or framework state, but no independent item API
was confirmed.

## Results

| Domain                       | Browser result                                                   | Integration decision                                                  |
| ---------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| `aukro.cz`                   | Public JSON offer endpoint confirmed                             | **API-first implemented**: `/backend-web/api/offers/{id}/offerDetail` |
| `allegro.pl`                 | Product JSON-LD and multiple embedded JSON payloads              | Structured-page parser; official REST offer access depends on OAuth   |
| `bidorbuy.co.ke`             | Product JSON-LD                                                  | Structured-page parser                                                |
| `book-ye.com.ua`             | Product JSON-LD                                                  | Structured-page parser                                                |
| `cdon.se`                    | Product JSON-LD and full Next product state; `shop-bff` detected | Prefer embedded Next data; official API is merchant-only              |
| `foxtrot.com.ua`             | Product JSON-LD                                                  | Structured-page parser                                                |
| `joom.com`                   | Product JSON-LD                                                  | Structured-page parser; known direct endpoint returned 401            |
| `us.vestiairecollective.com` | Product JSON-LD and full Next state                              | Structured-page parser; official API is seller-only                   |
| `zattini.com.br`             | Product JSON-LD                                                  | Structured-page parser                                                |
| `digitec.ch`                 | `/api/graphql` detected; redirected to CAPTCHA                   | Requires browser/proxy/session; no safe server API contract           |
| `galaxus.ch`                 | `/api/graphql` detected; redirected to CAPTCHA                   | Requires browser/proxy/session; no safe server API contract           |
| `alibris.com`                | Cloudflare verification                                          | Proxy/browser required                                                |
| `bonanza.com`                | Cloudflare verification                                          | Proxy/browser required                                                |
| `depop.com`                  | 403 with explicit IP block                                       | Proxy required; official API is partner/seller-only                   |
| `galerieslafayette.com`      | Access restricted                                                | Proxy/browser required                                                |
| `gamestop.com`               | Cloudflare block                                                 | Proxy/browser required                                                |
| `konga.com`                  | Cloudflare country block for UA                                  | Geo proxy required                                                    |
| `laredoute.ru`               | Country challenge                                                | Geo proxy required                                                    |
| `newegg.com`                 | Unusual-traffic block                                            | Proxy/browser required; official API is seller-only                   |
| `notonthehighstreet.com`     | Cloudflare verification                                          | Proxy/browser required                                                |
| `onbuy.com`                  | Cloudflare verification                                          | Proxy/browser required; official API requires seller plan             |
| `wehkamp.nl`                 | Bot puzzle                                                       | Browser/proxy required                                                |
| `worten.pt`                  | Product in Nuxt/SSR; supplemental specs API only                 | Parse structured SSR; proxy/browser may still be required             |
| `1stdibs.com`                | Empty protected shell                                            | Network contract unavailable without proxy                            |
| `lamoda.ru`                  | Product in SSR; APIs cover recommendations/reviews, not item     | Parse structured SSR; keep regular cascade                            |
| `manomano.fr`                | Empty protected shell                                            | Official API is seller-only; storefront contract unavailable          |
| `maudau.com.ua`              | Empty application shell                                          | Re-audit with browser network capture or proxy                        |
| `netshoes.com.br`            | Empty protected shell                                            | Network contract unavailable without proxy                            |
| `okazii.ro`                  | Empty protected shell                                            | Network contract unavailable without proxy                            |
| `otto.de`                    | Product in SSR; PDP APIs are supplemental                        | Parse structured SSR; official API remains seller-only                |
| `overstock.com`              | Empty protected shell                                            | Network contract unavailable without proxy                            |
| `rubylane.com`               | Product JSON-LD in initial SSR HTML                              | Parse JSON-LD through the regular cascade                             |
| `sears.com`                  | Empty protected shell                                            | Network contract unavailable without proxy                            |
| `yakaboo.ua`                 | Empty application shell                                          | Re-audit with browser network capture or proxy                        |
| `zozo.jp`                    | Empty protected shell                                            | Network contract unavailable without proxy                            |
| `darty.com`                  | HTTP response error                                              | Retry through Python/proxy                                            |
| `extra.in.ua`                | Invalid TLS certificate                                          | Do not bypass certificate validation                                  |
| `fnac.com`                   | HTTP response error                                              | Retry through Python/proxy                                            |
| `jane.com`                   | Domain did not resolve                                           | No integration possible for this URL                                  |
| `farfetch.com`               | Product URL redirected to login                                  | Public item API not available                                         |
| `n11.com`                    | Product URL redirected to category                               | Item unavailable/redirected; no stable API contract confirmed         |
| `shophouzz.com`              | Store closed and password route                                  | No active product integration                                         |
| `shpock.com`                 | Listing no longer exists                                         | Cannot validate an item endpoint with this URL                        |

## Coverage impact

- Public developer API adapters are disabled and those domains use regular parsing.
- Confirmed internal API-first domains in the report: Aukro, Best Buy Canada, Digitec, Galaxus,
  Rozetka, Noon and Meesho.
- Total internal API-first coverage in that report: **7 of 52**.
- `lazada.co.th` is also implemented but is not present in this particular report.
