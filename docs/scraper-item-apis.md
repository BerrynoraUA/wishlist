# API для отримання item/product data

Дата перевірки: 2026-07-03.

Джерело доменів: `scraper-test-2026-07-03T11-09-23-filtered.json` (52 унікальні домени).

## Висновок

Найкращі офіційні API саме для читання довільних публічних item/listing:

1. eBay Browse API
2. Etsy Open API
3. Discogs API
4. GunBroker REST API
5. bol Marketing Catalog API
6. AliExpress Affiliate/Open Platform API

Allegro та Aukro також мають офіційні API, але доступ до конкретних offer/item даних
залежить від endpoint, OAuth scope та політики платформи. Решта офіційних API у таблиці
переважно seller/partner-only: вони корисні для власного каталогу продавця, але не є
прямою заміною scraper для довільної сторінки товару.

## Офіційні API

| Сайт             | API та item-можливості                                                                                                                                 | Авторизація / доступ                                                                              | Pricing                                                                                                                                                           | Придатність для Wishlane                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `ebay.com`       | [Browse API](https://developer.ebay.com/api-docs/buy/static/api-browse.html): search, `getItem`, `getItemByLegacyId`, ціна, фото, seller, availability | eBay developer app, OAuth application token                                                       | Окрема плата за API не опублікована; діють [call limits](https://developer.ebay.com/develop/get-started/api-call-limits)                                          | **Висока.** Listing ID із URL можна конвертувати через `getItemByLegacyId`                          |
| `etsy.com`       | [Open API v3](https://developer.etsy.com/documentation/reference/): listing, images, inventory та shop data                                            | API key; частина public listing reads доступна без user OAuth, приватні операції потребують OAuth | Окремої ціни за API не опубліковано; QPS/QPD квоти видно в Developer Portal, див. [rate limits](https://developer.etsy.com/documentation/essentials/rate-limits/) | **Висока**, якщо app схвалений Etsy                                                                 |
| `discogs.com`    | [Discogs API](https://www.discogs.com/developers): releases, masters, marketplace inventory, images та пошук                                           | Token/OAuth для повного доступу; частина database reads доступна публічно                         | Окрема API-плата не опублікована; rate limits і [API Terms](https://support.discogs.com/hc/en-us/articles/360009334593-API-Terms-of-Use)                          | **Висока** для music releases; marketplace data має додаткові ліцензійні обмеження                  |
| `gunbroker.com`  | [REST API](https://api.gunbroker.com/User/Help): `GET /Items/{itemID}`, search/items, categories                                                       | DevKey; деякі routes також потребують access token                                                | Ціна DevKey публічно не вказана; доступ видається після заявки                                                                                                    | **Висока**, якщо GunBroker видасть DevKey                                                           |
| `bol.com`        | [Marketing Catalog API](https://api.bol.com/marketing/docs/catalog-api/api-documentation.html): product, offers, media, ratings, search                | Affiliate/marketing credentials; product lookup переважно за EAN                                  | Окрема API-плата не опублікована; потрібен партнерський/affiliate доступ                                                                                          | **Висока**, якщо із URL/HTML можна отримати EAN                                                     |
| `aliexpress.com` | AliExpress Open Platform / Affiliate Product API: product details, affiliate links, search                                                             | App key/secret, approval в Affiliate/Open Platform                                                | API зазвичай без окремої per-call плати; доступ і квоти залежать від схваленого app/account                                                                       | **Середня-висока.** Ціна може відрізнятися за країною, SKU, новим користувачем і промо              |
| `allegro.pl`     | [Allegro REST API](https://developer.allegro.pl/documentation/): products, offers та seller operations                                                 | OAuth; багато offer endpoints працюють у контексті авторизованого користувача/продавця            | Окрема API-плата не опублікована; platform rate limits                                                                                                            | **Середня.** Треба окремо підтвердити, що потрібний public offer доступний app без seller ownership |
| `aukro.cz`       | [Aukro Public API 2.0](https://api.aukro.cz/): auction/item та marketplace operations                                                                  | Обов’язковий API key; частина операцій потребує user authorization                                | Окремої API-ціни не опубліковано                                                                                                                                  | **Середня-висока** після отримання ключа                                                            |
| `depop.com`      | [Depop Selling API](https://partnerapi.depop.com/api-docs/): products/listings та seller operations                                                    | Partner API key; доступ видається партнерам                                                       | Публічного API pricing немає; partner approval                                                                                                                    | **Низька** для довільних чужих listings, **висока** лише для інтегрованого seller account           |
| `newegg.com`     | [Newegg Marketplace API](https://developer.newegg.com/newegg_marketplace_api/): item management, own inventory та price                                | Marketplace seller credentials                                                                    | Окремої API-плати не опубліковано; потрібен seller account                                                                                                        | **Низька** для довільного storefront item: API орієнтований на власні seller items                  |
| `onbuy.com`      | [OnBuy API v2](https://docs.api.onbuy.com/): product search/catalog, listings, stock і prices                                                          | Seller API keys → access token                                                                    | API входить у seller plan. На момент перевірки [Standard — €29/міс., Partner — €79/міс., Professional — €299/міс.](https://www.onbuy.com/nl/sell/) без VAT        | **Середня**, але потрібен seller account; catalog search доступний у межах API credentials          |
| `otto.de`        | [OTTO Market API](https://api.otto.market/docs/getting-started): products, availability, prices, orders                                                | Seller/service-partner OAuth2 credentials                                                         | Окрема API-плата не опублікована; потрібен OTTO Market seller/partner onboarding                                                                                  | **Низька** для довільного consumer item; API керує каталогом конкретного seller                     |
| `cdon.se`        | [CDON Merchant API](https://docs.cdon.com/): articles/products, images, description, stock і market prices                                             | Basic Auth `merchantID:token`                                                                     | Окрема API-плата не опублікована; потрібен merchant account                                                                                                       | **Низька** для довільного CDON listing; **висока** для власного merchant catalog                    |
| `manomano.fr`    | ManoMano Seller/Toolbox interfaces: product feed, offers та orders                                                                                     | Seller/partner credentials                                                                        | Окремого публічного API pricing немає; потрібен seller agreement                                                                                                  | **Низька** для довільного item; API переважно seller-facing                                         |

## Storefront/internal API без окремої user-авторизації

Ці interfaces не є публічними developer API. Вони використовуються самим сайтом,
можуть вимагати locale/cookie/header, змінитися без попередження або бути заборонені
Terms of Service. Перед production-інтеграцією треба перевірити ToS, robots policy,
rate limits і юридичну підставу використання.

| Сайт                       | Ймовірний internal source                                                                                       | Auth стан                                                                          | Pricing                                            | Оцінка                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| `rozetka.com.ua`           | Catalog API, який storefront викликає за `goodsId` із `/p{id}/`; повертає title, images, prices та availability | Зазвичай без login; потрібні locale/country query params                           | Безкоштовний як внутрішній endpoint, SLA відсутній | **Найкращий internal кандидат**: стабільний numeric goods ID             |
| `lazada.co.th`             | Storefront PDP modules endpoint за item/SKU ID                                                                  | Зазвичай без account auth, але потрібні locale, user-agent та іноді cookies        | Без API pricing/SLA                                | **Висока технічна придатність**, високий ризик змін/anti-bot             |
| `noon.com`                 | Storefront catalog/PDP JSON service за product code, наприклад `N70283859V`                                     | Без login, але locale/country headers впливають на offer і price                   | Без API pricing/SLA                                | **Висока**, якщо зберігати region/locale контекст                        |
| `meesho.com`               | Storefront product JSON/BFF за slug/product ID (`1kv4b`)                                                        | Часто без login; можуть бути device/session headers                                | Без API pricing/SLA                                | **Середня-висока**, контракт undocumented                                |
| `joom.com`                 | Storefront product service за object ID (`5ef9...`)                                                             | Public PDP read зазвичай без login; locale/currency context обов’язковий           | Без API pricing/SLA                                | **Середня-висока**, але endpoint/version може змінюватися                |
| `n11.com`                  | Storefront BFF/GraphQL та embedded product state                                                                | Часто без login для PDP, інколи потрібні cookies/headers                           | Без API pricing/SLA                                | **Середня**                                                              |
| `galaxus.ch`, `digitec.ch` | Спільний storefront BFF/GraphQL, product ID є останнім сегментом URL                                            | Public reads можуть працювати без login, але anti-bot/session context нестабільний | Без API pricing/SLA                                | **Середня**, один адаптер може покрити обидва домени                     |
| `maudau.com.ua`            | Storefront product/catalog JSON, product slug/ID присутній у page data                                          | Зазвичай без user login                                                            | Без API pricing/SLA                                | **Середня**, спершу зафіксувати endpoint через browser Network           |
| `foxtrot.com.ua`           | Storefront AJAX/catalog endpoints та embedded structured state                                                  | Public PDP без login                                                               | Без API pricing/SLA                                | **Середня**; embedded JSON може бути надійнішим за undocumented endpoint |
| `yakaboo.ua`               | Storefront catalog/GraphQL або embedded JSON для product page                                                   | Public read без login                                                              | Без API pricing/SLA                                | **Середня**; JSON-LD уже може бути простішим і стабільнішим              |
| `bol.com`                  | Внутрішній storefront BFF                                                                                       | Не розрахований на third-party; cookies/headers можуть змінюватися                 | Без API pricing/SLA                                | **Не рекомендується**, бо є офіційний Marketing Catalog API              |
| `aliexpress.com`           | Внутрішні MTop/PDP endpoints                                                                                    | Часто потрібні cookies, generated signatures і locale/device context               | Без API pricing/SLA                                | **Не рекомендується**, якщо доступний офіційний Affiliate API            |

## Не знайдено придатного item API

Для решти доменів у документі не знайдено підтвердженого developer API, який
повертає довільний public item, або доступ обмежений закритими partner agreements:

`1stdibs.com`, `alibris.com`, `bidorbuy.co.ke`, `book-ye.com.ua`, `bonanza.com`,
`darty.com`, `extra.in.ua`, `farfetch.com`, `fnac.com`, `galerieslafayette.com`,
`gamestop.com`, `jane.com`, `konga.com`, `lamoda.ru`, `laredoute.ru`,
`netshoes.com.br`, `notonthehighstreet.com`, `okazii.ro`, `overstock.com`,
`rubylane.com`, `sears.com`, `shophouzz.com`, `shpock.com`,
`vestiairecollective.com`, `wehkamp.nl`, `worten.pt`, `zattini.com.br`, `zozo.jp`.

Це не доводить, що внутрішніх endpoint немає — лише що немає достатньо стабільного
та документованого кандидата для інтеграції без додаткового live Network-аудиту.

## Рекомендований порядок впровадження

1. Офіційні read APIs: eBay → Etsy → Discogs → GunBroker → bol → AliExpress.
2. Internal adapters із простим ID: Rozetka → Noon → Lazada → Meesho → Joom.
3. Один спільний Galaxus/Digitec adapter.
4. Seller-only APIs додавати лише якщо Wishlane матиме відповідні partner accounts.
5. Для internal API залишати HTML/JSON-LD fallback і автоматичний circuit breaker:
   після 401/403/429 або schema mismatch одразу повертатися до звичайного scraper
   cascade.

## Реалізовано

Public developer API adapters для eBay, Etsy, Discogs, GunBroker, bol та AliExpress вимкнені.
Ці домени використовують звичайний legacy/Scrapling parsing pipeline і не потребують API keys.

Internal API-first adapters також реалізовані для:

- Aukro Offer Detail API;
- Best Buy Canada Catalog API;
- Digitec/Galaxus Product GraphQL;
- Rozetka Catalog API;
- Noon Catalog API;
- Meesho Product API;
- Lazada PDP Modules API.

Якщо Next отримує 403/429 або network error, endpoint повторюється через окремий Python
transport: спочатку direct HTTP, потім HTTP proxy. Цей transport не запускає HTML parsing,
browser або Jina.

Joom, N11, Galaxus/Digitec, Maudau, Foxtrot і Yakaboo не перемикаються на API-first без
підтвердженого server-side контракту. Їхні відомі endpoints потребують session/auth,
підписаного GraphQL/BFF request або не повертають повний item. Вигаданий endpoint чи
копіювання короткоживучого browser token було б нестабільнішим за чинний scraper cascade.

Повний browser-аудит решти 43 доменів: `docs/scraper-api-audit-43.md`.
Перший HAR batch: `docs/har-api-batch-1.md`.
