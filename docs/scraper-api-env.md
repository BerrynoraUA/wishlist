# Scraper internal API transport

Public developer APIs are currently disabled. eBay, Etsy, Discogs, GunBroker, bol and AliExpress
use the regular legacy/Scrapling parsing pipeline and require no API credentials.

API-first is enabled only for internal storefront endpoints that can read a public item without
developer credentials: Aukro, Rozetka, Noon, Meesho and Lazada.

## Python API transport

When Next receives 403/429 or a network error from a supported API, it calls the scraper service:

```dotenv
SCRAPLING_SERVICE_URL=http://79.143.95.197:8001
```

The Python service retries the JSON endpoint directly.

Only allowlisted marketplace API hosts and a restricted set of request headers are accepted by
`POST /v1/api-fetch`. Browser stages are not used for API requests.
