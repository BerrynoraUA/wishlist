# Scraper internal API transport

Public developer APIs are currently disabled. eBay, Etsy, Discogs, GunBroker, bol and AliExpress
use the regular legacy/Scrapling parsing pipeline and require no API credentials.

API-first is enabled only for internal storefront endpoints that can read a public item without
developer credentials: Aukro, Rozetka, Noon, Meesho and Lazada.

## Python API transport

When Next receives 403/429 or a network error from a supported API, it calls the scraper service:

```dotenv
SCRAPLING_SERVICE_URL=http://127.0.0.1:8001
```

The Python service first retries the JSON endpoint directly and then through the configured proxy:

```dotenv
SCRAPER_ENABLE_PROXY=true
SCRAPER_PROXY_URL=https://user:password@proxy.example:port
```

Only allowlisted marketplace API hosts and a restricted set of request headers are accepted by
`POST /v1/api-fetch`. Browser and Jina stages are not used for API requests.
