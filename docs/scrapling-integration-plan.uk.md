# План інтеграції Scrapling у Wishlane

Дата аналізу: 29 червня 2026  
Статус: план, без змін production-коду

## 1. Резюме рішення

Рекомендований найдешевший варіант — не замінювати поточний Next.js scraper одразу, а поставити Scrapling як окремий Python-сервіс другого рівня. Для кожного URL має працювати каскад:

1. **Поточний Next.js endpoint**: прямий `fetch` + наявні store-specific і generic parser-и.
2. **Scrapling без proxy**:
   - спочатку швидкий HTTP fetch із browser/TLS impersonation;
   - лише за потреби — JS browser;
   - лише для захищених сайтів — stealth browser.
3. **Scrapling з rotating residential proxy**:
   - HTTP + proxy;
   - за потреби stealth browser + proxy.
4. Якщо даних усе ще недостатньо — повернути контрольовану часткову відповідь або помилку, не нескінченно повторювати запит.

Це зберігає майже нульову додаткову вартість для URL, які вже працюють, і витрачає proxy-трафік тільки на проблемні сайти. Scrapling слід використати і як fetch-рівень проти 403, і як стійкіший parser-рівень, але не вважати adaptive parsing повною заміною JSON-LD, Open Graph, store API та перевірок якості.

## 2. Що є у Wishlane зараз

### 2.1. Поточний потік

Точки входу:

- web/extension: `GET /api/server/scrape-product?url=...`;
- native: `POST /api/server/scrape-product`;
- обидва викликають одну функцію `scrapeProduct(url)`.

Поточний pipeline:

```text
Client
  → Next.js /api/server/scrape-product
    → SSRF validation
    → fetch(target URL, fixed headers)
    → store-specific parser
    → JSON-LD parser
    → generic Cheerio parser
    → regex parser
    → ProductData | null
```

У реєстрі є 28 доменних правил, реалізованих у 25 store-файлах. Окремі магазини замість HTML або після нього звертаються до внутрішніх API/reader endpoint-ів. Є три generic parser-и: JSON-LD, Cheerio і regex. Автоматизованих unit/fixture-тестів безпосередньо для scraper-а не знайдено.

Контракт результату:

```ts
{
  title: string | null;
  description: string | null;
  image: string | null;
  price: string | null;
  discount_price: string | null;
  has_discount: boolean;
  discount_end_date: string | null;
  currency: string | null;
}
```

### 2.2. Причини 403 і блокувань

Поточний direct fetch має короткий фіксований `User-Agent` і `Accept-Language`, але не відтворює узгоджений browser fingerprint:

- немає TLS/HTTP fingerprint реального браузера;
- немає повного набору узгоджених browser headers;
- усі запити виходять із IP hosting-провайдера;
- немає загального cookie/session reuse;
- немає JS execution;
- немає загальної детекції challenge page, soft block або CAPTCHA;
- немає per-domain rate limit, cooldown, circuit breaker чи proxy rotation;
- retry практично відсутній;
- один спеціальний cookie challenge обробляється точково і не масштабується.

Тому проста зміна `User-Agent` не вирішить проблему: антибот може бачити невідповідність між заголовками, TLS fingerprint, поведінкою браузера та репутацією IP.

### 2.3. Причини ламкості parsing

- Багато store parser-ів залежать від конкретних CSS-селекторів, regex або форми inline JSON.
- Store parser повертається відразу, якщо знайшов `price`, навіть якщо інші поля слабкі або помилкові.
- Немає формального quality score: “будь-яке непорожнє поле” фактично може вважатися успіхом.
- Немає schema validation для ціни, валюти, URL зображення й узгодженості discount.
- Немає golden HTML fixtures та regression suite.
- Немає метрик success rate по домену, полю, parser-у та способу fetch.
- Зміни HTML виявляються користувачами, а не автоматичним моніторингом.
- `catch` у route приховує тип причини: timeout, DNS, 403, challenge, parse failure тощо.

Git-історія scraper-каталогу містить багато окремих `fix scrapers` / `change scrapping`, що підтверджує значне ручне обслуговування.

## 3. Чим конкретно допоможе Scrapling

Репозиторій містить Scrapling `0.4.9`, Python `>=3.10`; статус у metadata — Beta.

### 3.1. Проти 403

Scrapling дає три fetch-рівні:

| Рівень                     | Механізм                                                              |         Вартість/швидкість | Коли застосовувати      |
| -------------------------- | --------------------------------------------------------------------- | -------------------------: | ----------------------- |
| `Fetcher` / `AsyncFetcher` | HTTP без browser, TLS/browser impersonation, stealthy headers, HTTP/3 |   найдешевший і найшвидший | перша Scrapling-спроба  |
| `DynamicFetcher`           | Chromium/Chrome через Playwright, JS, cookies, sessions               | більше RAM/CPU, повільніше | SPA або дані після JS   |
| `StealthyFetcher`          | stealth browser, fingerprint spoofing, Cloudflare options             |      найдорожчий без proxy | hard anti-bot/challenge |

Додаткові корисні механізми:

- browser/TLS impersonation з ротацією Chrome/Firefox/Safari профілів;
- узгоджені stealth headers;
- persistent sessions, cookies та стабільний fingerprint;
- очікування selector/network idle замість випадкового sleep;
- блокування ads/trackers для швидшого browser fetch і меншого proxy-трафіку;
- блокування WebRTC та DNS-over-HTTPS для зменшення proxy leaks;
- Cloudflare challenge handling через `solve_cloudflare`;
- перехоплення XHR/API responses: інколи дешевше і стабільніше читати product JSON, ніж DOM;
- proxy на запит, sticky sessions і `ProxyRotator`;
- вбудована blocked-response detection для `401, 403, 407, 429, 444, 500, 502, 503, 504`;
- можливість додати soft-block сигнатури: `access denied`, CAPTCHA, порожня product page, challenge HTML;
- custom retry, зміна session/fingerprint/proxy при повторі;
- per-domain concurrency і download delay через spider/session orchestration.

Scrapling не гарантує обхід кожного захисту. CAPTCHA, login wall, geo restrictions, fingerprint reputation і зміни антибота все одно можуть вимагати окремих правил або іншого proxy pool.

### 3.2. Проти змін HTML

Adaptive parsing працює у два етапи:

1. На відомій коректній сторінці зберігаються властивості знайденого елемента: tag, text, attributes, siblings, path, parent.
2. Якщо старий selector зник, Scrapling шукає найбільш схожий елемент.

Переваги:

- переживає перестановку wrapper-ів, зміну class/id та частковий redesign;
- не потребує LLM на кожний запит;
- працює з CSS/XPath та ручними semantic identifiers;
- adaptive state можна зберігати централізовано.

Обмеження, які обов'язково врахувати:

- спочатку треба отримати й зберегти **правильний** element;
- схожість може вибрати неправильний element без domain validation;
- automatic save для selection зберігає властивості лише першого element;
- повний redesign або зміна способу доставки даних adaptive parsing не врятує;
- SQLite за замовчуванням непридатний як єдине shared state у кількох ephemeral replicas;
- adaptive слід застосовувати до стабільних semantic blocks/полів, а не до всього документа;
- ціна потребує особливо жорсткої перевірки, бо неправильна ціна гірша за відсутню.

Правильний порядок джерел даних:

```text
official/internal product API
  → schema.org Product JSON-LD
  → Open Graph/product meta
  → domain selectors
  → saved adaptive selectors
  → generic semantic heuristics
```

## 4. Цільова архітектура

### 4.1. Компоненти

```text
Web / Native / Extension
          │
          ▼
Next.js scrape-product API (єдиний public endpoint)
          │
          ├─ L0: cache / recent successful result
          │
          ├─ L1: existing Next direct fetch + parsers
          │       └─ success if quality gate passed
          │
          └─ internal signed HTTP call
                  ▼
            Scrapling Python service
              ├─ L2: HTTP impersonation, no proxy
              ├─ L3: browser/stealth, no proxy (conditional)
              ├─ L4: HTTP impersonation + residential proxy
              └─ L5: stealth browser + residential proxy
                       │
                       ▼
             normalized ProductData + diagnostics
```

Scrapling не варто вбудовувати у Vercel/Next function: це Python, браузерні binaries, persistent session/storage і значно вищі RAM/timeout requirements. Окремий container service простіше контролювати та дешевше масштабувати незалежно.

### 4.2. Public та internal контракти

Public response лишається сумісним із поточними клієнтами. Internal Scrapling API:

```json
POST /v1/scrape
{
  "url": "https://shop.example/product/123",
  "domainPolicy": "auto",
  "requestId": "uuid",
  "deadlineMs": 18000
}
```

Internal response:

```json
{
  "product": {
    "title": "...",
    "description": null,
    "image": "https://...",
    "price": "1299.00",
    "discount_price": null,
    "has_discount": false,
    "discount_end_date": null,
    "currency": "UAH"
  },
  "quality": {
    "score": 0.91,
    "requiredFieldsPresent": true,
    "warnings": []
  },
  "diagnostics": {
    "fetchMode": "http_no_proxy",
    "parserSources": {
      "title": "json_ld",
      "price": "json_ld",
      "image": "og"
    },
    "status": 200,
    "attempts": 1,
    "elapsedMs": 730,
    "proxiedBytes": 0
  }
}
```

Diagnostics не слід віддавати public-клієнту. Вони потрібні для logs, metrics та контролю бюджету.

### 4.3. Quality gate

Fallback запускається не лише після HTTP error. Next L1 вважається успішним, якщо:

- є `title`;
- є хоча б одне з `price` або `image`;
- price, якщо є, парситься як додатне число в розумному діапазоні;
- currency належить allowlist або може бути надійно визначена;
- image — абсолютний `http(s)` URL, не placeholder/data URI;
- HTML не схожий на challenge, login або soft-block;
- title не дорівнює `Access denied`, `Just a moment`, доменному suffix чи CAPTCHA text.

Пропонований score:

- title: 25;
- price: 30;
- currency: 10;
- image: 20;
- description: 5;
- збіг двох незалежних джерел для price/title: +10;
- challenge/placeholder/невалідне значення: від −20 до повного reject.

Для автоматичного прийняття: score `>=70`, при цьому title обов'язковий. Пороги треба відкалібрувати на production samples.

### 4.4. Точний fallback-алгоритм

1. Normalize URL, remove fragment, unwrap known tracking redirects.
2. Повторити SSRF validation у Next і Scrapling service:
   - лише HTTP/HTTPS;
   - заборонити credentials у URL;
   - DNS resolve і deny private, loopback, link-local, metadata IP;
   - перевіряти кожен redirect;
   - обмежити response size.
3. Перевірити cache за canonical URL.
4. Запустити поточний Next scraper з коротким timeout.
5. Якщо response пройшов quality gate — повернути й записати success.
6. Якщо ні — викликати Scrapling HTTP/no-proxy:
   - rotating browser impersonation;
   - domain-specific locale;
   - session reuse;
   - один retry лише при transport error/429/403 із новим profile.
7. Parse через API/JSON-LD/OG/domain/adaptive/generic chain.
8. Якщо сторінка потребує JS або challenge — один browser/stealth no-proxy attempt.
9. Якщо failure класифіковано як IP block, geo block, rate limit або challenge не вирішено — proxy tier:
   - residential rotating proxy потрібної країни;
   - спочатку HTTP impersonation;
   - stealth browser + sticky proxy лише якщо потрібні JS/cookies/challenge.
10. Merge тільки узгоджені поля; не перезаписувати надійне поле слабшим джерелом.
11. Cache success. Negative cache коротко зберігати для hard failures.
12. Після budget/deadline/attempt limit повернути partial result або контрольовану помилку.

Не робити три blind retries одного й того самого режиму: це збільшує блокування й рахунок без нової стратегії.

## 5. Domain policy: основа дешевої роботи

Зберігати конфігурацію не в коді parser-а, а в окремому registry:

```yaml
amazon.com:
  preferred_locale: en-US
  country: US
  next_enabled: true
  scrapling_http_enabled: true
  browser_on: [js_required, challenge]
  proxy_on: [ip_block, geo_block, repeated_403]
  sticky_session: true
  max_attempts: 4
  rate_limit_rps: 0.3
  parser_profile: amazon
```

На домен потрібні:

- доступні fetch modes;
- timeout і max response bytes;
- locale/country;
- concurrency/RPS;
- block signatures;
- proxy type: none/residential/mobile;
- sticky чи rotating session;
- browser resource allow/block list;
- required поля й quality threshold;
- parser profile;
- circuit-breaker state.

Після накопичення метрик policy може оптимізуватися:

- якщо Next success >95% — не міняти маршрут;
- якщо Next майже завжди дає 403, одразу йти в Scrapling HTTP;
- якщо HTTP no-proxy стабільно заблокований, не витрачати latency на нього протягом cooldown;
- якщо домен завжди вимагає JS, одразу йти в browser;
- proxy вмикати тільки для доменів, де він підвищує cost per successful scrape.

## 6. Parsing strategy

### 6.1. Спільний extractor

Не переносити 25 store-файлів рядок у рядок у Python. Спочатку реалізувати reusable extraction:

- recursive пошук `Product` у JSON-LD, включно з `@graph` і масивами;
- offers як object/array/AggregateOffer;
- `price`, `lowPrice`, `highPrice`, `priceCurrency`, availability;
- OG/Twitter/product meta;
- canonical URL та image normalization;
- generic semantic attributes: `itemprop`, `data-testid`, `aria-label`;
- currency normalization без втрати locale decimal separators;
- discount consistency.

Store-specific profile залишити тільки там, де generic structured data реально недостатні:

- стабільний internal product API;
- специфічний embedded application state;
- особлива логіка current/original price;
- geo/locale поведінка;
- challenge/API reader.

### 6.2. Adaptive state

Для кожного domain/profile зберігати semantic identifiers:

- `product.title`;
- `product.price.current`;
- `product.price.original`;
- `product.image.primary`;
- `product.description`;
- `product.currency`.

Процес:

1. Selector знайшов field і validation підтвердила його.
2. `auto_save` дозволено тільки після високої впевненості або manual approval.
3. При зникненні selector виконується adaptive lookup.
4. Adaptive result проходить ті самі validation і cross-source checks.
5. Новий match спершу працює у shadow mode; не слід одразу перезаписувати baseline.
6. Якщо match стабільний на кількох сторінках — promote.

Для MVP допустимий SQLite на persistent volume з однією replica. Для горизонтального scaling потрібен custom shared storage або контрольована синхронізація; ephemeral SQLite втратить навчений state після deploy.

### 6.3. Fixtures і regression tests

Для кожного підтримуваного домену:

- 3–5 HTML fixtures: regular, discounted, unavailable, variant, changed layout;
- expected normalized product JSON;
- challenge/403 fixture;
- unit tests для кожного source extractor;
- fixture із модифікованим DOM для adaptive test;
- golden test контракту TypeScript ↔ Python;
- SSRF/redirect/oversized response tests.

HTML fixtures не повинні містити персональні cookies/tokens. Production sample зберігати після sanitization.

## 7. Retry, block detection і захист target-сайтів

### 7.1. Block classifier

Класи:

- `transport_error`;
- `timeout`;
- `http_block` — 401/403/407/429/444;
- `server_transient` — 500/502/503/504;
- `soft_block` — 200 із challenge/access-denied/CAPTCHA;
- `js_required`;
- `geo_block`;
- `parse_incomplete`;
- `invalid_product`;
- `not_found`;
- `robots_or_policy_denied`.

Перехід між рівнями залежить від класу. Наприклад, HTML change не виправляється proxy, а IP block не виправляється новим CSS selector.

### 7.2. Limits

Початкові безпечні значення:

- Next attempt: 4–6 s;
- Scrapling HTTP: 6–8 s;
- browser no-proxy: 10–15 s;
- proxy HTTP: 8–10 s;
- proxy browser: 15–20 s;
- загальний deadline user request: 20–25 s;
- max attempts: 4;
- exponential backoff із jitter тільки для async/background повторів;
- per-domain circuit breaker після серії блоків;
- global concurrency окремо для HTTP і browser pool;
- hard monthly proxy budget і per-domain budget.

Щоб не тримати користувача 40+ секунд, у MVP доцільно обмежити синхронний шлях трьома фактичними спробами, а останній дорогий retry робити тільки якщо лишається deadline.

## 8. Cache та дедуплікація

Найдешевший scrape — той, якого не було.

- Cache key: canonical URL + locale/country + parser version.
- Success TTL: 6–24 години для створення item; довший TTL допустимий, якщо ціна не оновлюється автоматично.
- Negative TTL:
  - 403/429: 5–15 хвилин;
  - not found: 1–6 годин;
  - parse failure: 15–60 хвилин.
- Single-flight lock: однакові concurrent URL не мають запускати кілька browser/proxy jobs.
- Не cache challenge HTML як product page.
- Зберігати provenance та timestamp.

Якщо Redis ще немає, MVP може використати наявну БД/таблицю з hash canonical URL; in-memory cache не працює на кількох replicas і зникає після deploy.

## 9. Безпека та правові обмеження

- Public endpoint зараз не вимагає auth; перед дорогим fallback потрібні user/IP rate limits і quota, інакше його можна використати як безкоштовний proxy.
- Internal Scrapling endpoint має бути private або підписаний HMAC із timestamp/nonce.
- Не логувати proxy credentials, cookies, authorization headers і повні query params із tokens.
- Повторити SSRF захист у двох сервісах; redirect rebinding теж перевіряти.
- Обмежити response bytes, redirect count, content type і decompressed size.
- Дотримуватися target ToS, robots/policies та законних обмежень. Технічна можливість обходу 403 не є автоматичним дозволом.
- Не обходити login/paywall і не збирати приватні дані.
- Proxy provider має мати прозоре/етичне походження residential IP.

## 10. Спостережуваність

Метрики:

- requests і success rate за domain;
- success за level: Next, HTTP no-proxy, browser no-proxy, proxy HTTP, proxy browser;
- 403/429/soft-block rate;
- field completeness: title/price/currency/image;
- p50/p95 latency за level/domain;
- retry count;
- browser pool utilization і crashes;
- proxy bytes і cost;
- cost per successful product;
- adaptive fallback count, acceptance/rejection rate;
- parser/source distribution;
- circuit breaker openings.

Для debugging зберігати:

- request ID;
- domain, status, content length/hash;
- fetch mode і parser sources;
- redacted failure reason;
- HTML snapshot тільки для allowlisted failed samples, із retention та sanitization.

Alerts:

- domain success впав >20 percentage points;
- 403/429 подвоївся;
- adaptive usage різко зросло;
- proxy spend перевищив daily trajectory;
- browser crash rate >5%;
- price validation failures ростуть.

## 11. Оцінка вартості

### 11.1. Ліцензія

Scrapling має BSD license: плати за бібліотеку немає. Витрати — compute, proxy traffic, storage/metrics і engineering support.

### 11.2. Hosting Python service

Практичний бюджет:

| Режим                                  |     Орієнтир | Коментар                                   |
| -------------------------------------- | -----------: | ------------------------------------------ |
| Dev/PoC, scale-to-zero                 |    $0–5/міс. | cold start; не гарантує production latency |
| HTTP worker, мінімальний production    |   $5–15/міс. | без постійного великого browser pool       |
| 1 browser worker, приблизно 1–2 GB RAM |  $15–35/міс. | реалістичний старт                         |
| 2 replicas / більше concurrency        | $30–80+/міс. | залежить від browser utilization           |

Як контрольний приклад, Railway станом на дату плану має Hobby minimum $5, RAM $10/GB-month, CPU $20/vCPU-month, egress $0.05/GB. Тому постійно зарезервовані 1 GB RAM + 0.25 vCPU дають близько $15/міс., 2 GB + 0.5 vCPU — близько $30/міс. Фактичний usage-based bill залежить від активного часу.

Джерело: [Railway pricing](https://docs.railway.com/pricing).

### 11.3. Proxy

Для дешевого старту підходить rotating residential PAYG без місячної підписки. Наприклад, DataImpulse публікує $1/GB, minimum purchase $5, traffic без expiry. Webshare rotating residential на поточній сторінці — $3.50 за 1 GB monthly, дешевше на більших commitment.

Джерела: [DataImpulse residential pricing](https://dataimpulse.com/residential-proxies/), [Webshare pricing](https://www.webshare.io/pricing).

Формула:

```text
proxy cost =
  total requests
  × proxy fallback share
  × average transferred MB per proxied attempt
  × average attempts
  ÷ 1024
  × price per GB
```

Приклад при $1/GB:

| Scrape requests/міс. | Proxy fallback | MB/attempt | Attempts | Proxy cost |
| -------------------: | -------------: | ---------: | -------: | ---------: |
|                1,000 |            10% |          1 |      1.2 |     ~$0.12 |
|               10,000 |            10% |          1 |      1.2 |     ~$1.17 |
|              100,000 |            10% |          1 |      1.2 |    ~$11.72 |
|              100,000 |            30% |          2 |      1.5 |    ~$87.89 |

Ці цифри — модель, не гарантія. Browser без resource blocking може завантажити кілька MB на сторінку. Ads, video, fonts, analytics та непотрібні images слід блокувати; потрібне primary product image можна отримати окремо або не завантажувати binary взагалі.

Datacenter proxy дешевший, але часто не змінює результат для сайтів, що блокують hosting ASN. Рекомендація: не додавати окремий datacenter-proxy level у MVP, доки A/B test не покаже нижчий cost per success. Mobile proxy залишити тільки як ручний/allowlisted крайній tier.

### 11.4. Загальний місячний бюджет

За малого/середнього навантаження:

| Стаття            |                           Lean MVP |                    Production start |
| ----------------- | ---------------------------------: | ----------------------------------: |
| Scrapling hosting |                              $5–15 |                              $15–35 |
| Residential proxy | $5 initial credit; usage часто <$5 | $5–30 типово, залежить від fallback |
| Storage/metrics   |                               $0–5 |                               $0–15 |
| Разом infra       |              приблизно $10–25/міс. |               приблизно $20–80/міс. |

Головний ризик вартості — не сама ціна proxy, а неконтрольований browser/proxy fallback і retries. Budget guardrails важливіші за вибір найдешевшого $/GB.

### 11.5. Вартість підтримки

Після стабілізації:

- 2–4 год/міс. при невеликій кількості доменів і добрих metrics/fixtures;
- 4–8 год/міс. для поточних ~28 integrations;
- 8–16+ год/міс. при частих anti-bot змінах або вимозі високого SLA.

Очікуване зменшення ручних HTML fixes — орієнтовно 30–60%, але не 100%. Реальний ефект треба виміряти 4–6 тижнів: кількість incidents, час ремонту, adaptive recoveries та wrong-field rate.

## 12. Етапи реалізації

### Етап 0. Baseline — 2–3 дні

- Додати структуровані failure reasons у поточний scraper.
- Зібрати 50–100 реальних sanitized URL по ключових доменах.
- Зафіксувати Next success rate, 403 rate, completeness та latency.
- Визначити top 5 доменів за traffic і failures.
- Зафіксувати місячний scrape volume — без нього budget лишається сценарною оцінкою.

Критерій готовності: є dashboard/baseline, на якому можна довести користь нового рівня.

### Етап 1. Контракт і Python service skeleton — 2–4 дні

- Container з pinned Scrapling version і browser dependencies.
- `POST /v1/scrape`, health/readiness endpoints.
- Internal auth, deadline propagation, SSRF validation.
- ProductData schema та typed client у Next.
- Structured diagnostics.
- CI: lint, unit, container build, smoke test.

### Етап 2. Scrapling HTTP/no-proxy — 3–5 днів

- Async HTTP fetcher з browser impersonation.
- Reusable JSON-LD/OG extractor.
- Quality score і source provenance.
- Sessions, timeout, response-size limits.
- Next fallback call тільки після L1 failure.
- Shadow mode: порівнювати, не віддавати користувачу.

Критерій: на sample set підвищення success без зростання wrong data; p95 вкладається в deadline.

### Етап 3. Browser/stealth no-proxy — 3–5 днів

- Browser pool/session reuse.
- JS-required і challenge classifier.
- Resource blocking, wait strategy, XHR capture.
- Stealth/Cloudflare option тільки для allowlisted domains/signals.
- Concurrency and crash recovery.

### Етап 4. Residential proxy tier — 2–4 дні

- Один PAYG provider, secrets і country routing.
- Rotation; sticky session для browser challenge.
- Proxy only on classified block.
- Spend/bytes metrics, hard daily/monthly cap.
- Circuit breaker і provider kill switch.

Критерій: proxy tier має позитивний приріст success і прийнятний cost per successful scrape.

### Етап 5. Adaptive parsing — 4–7 днів

- Почати з 3–5 найпроблемніших доменів, не з усіх 28.
- Semantic identifiers і persistent adaptive storage.
- Manual seed із перевірених fixtures.
- Shadow validation adaptive matches.
- Promote лише після regression і production sampling.

### Етап 6. Rollout — 5–10 робочих днів спостереження

- 5% traffic для top domains;
- 25%;
- 50%;
- 100% fallback traffic;
- per-domain kill switches;
- щоденний review quality/cost/latency.

Орієнтир повного MVP: 3–5 інженерних тижнів для одного розробника з тестами й rollout. Aggressive PoC можна зробити швидше, але він не дасть безпечного production fallback.

## 13. Порядок міграції 28 integrations

Не мігрувати всі одночасно:

1. Top domains із найбільшою кількістю 403.
2. Top domains із найбільшою кількістю parse failures.
3. Домени зі стабільним JSON-LD — вони швидко переходять на generic extractor.
4. Домени з internal API.
5. Hard anti-bot домени.
6. Long tail.

Для кожного domain заповнити картку:

- monthly requests;
- Next success/403/parse incomplete;
- best fetch mode;
- proxy success delta;
- average proxied MB;
- required fields;
- current selectors/APIs;
- fixtures;
- adaptive enabled;
- legal/policy note;
- owner і last verified date.

Поточні TypeScript store parser-и видаляти лише після 2–4 тижнів успішного shadow/production порівняння. До того вони є дешевим primary path і rollback.

## 14. Acceptance criteria

Для запуску:

- +15 percentage points або більше до aggregate successful extraction на проблемній вибірці;
- не менше 95% field correctness на manual labeled sample;
- wrong price <0.5%; ціль — <0.1%;
- proxy використовується лише після дозволеного trigger;
- p95 Next-only не погіршується суттєво;
- p95 fallback вкладається в 20–25 s;
- є hard budget cap;
- немає SSRF bypass на redirects/DNS rebinding tests;
- кожен production domain має fixtures;
- deploy/rollback не втрачає adaptive state;
- kill switch працює глобально і per-domain.

Через 4–6 тижнів оцінити:

- cost per successful scrape;
- частку запитів на кожному рівні;
- saved failures через adaptive;
- false adaptive matches;
- engineering hours на fixes;
- які domain policies можна скоротити або перескочити.

## 15. Ризики та запобіжники

| Ризик                             | Наслідок                    | Запобіжник                                            |
| --------------------------------- | --------------------------- | ----------------------------------------------------- |
| Adaptive вибрав не ту ціну        | тихі неправильні дані       | quality gate, cross-source check, shadow mode         |
| Proxy fallback зациклився         | неконтрольовані витрати     | max attempts, deadline, daily/monthly cap             |
| Browser завантажує всі assets     | трафік і latency            | resource blocking, XHR/HTML first                     |
| SQLite втрачено при deploy        | adaptive перестає працювати | persistent volume, backup; shared storage при scaling |
| Public endpoint аб'юзять          | рахунок і SSRF-ризик        | auth/quota/rate limit, internal signed API            |
| Hosting IP заблокований           | no-proxy level марний       | domain cooldown і direct proxy routing після доказів  |
| Scrapling beta regression         | production outage           | pin exact version, fixtures, staged upgrades          |
| Два parser-и дають різні значення | неправильний merge          | provenance, source priority, conflict rejection       |
| Proxy country змінює ціну/валюту  | неправильна локаль          | explicit country/locale policy                        |
| CAPTCHA не розв'язано             | довгі timeouts              | one controlled attempt, fail/partial result           |

## 16. Що не варто робити

- Не запускати stealth browser для кожного URL.
- Не використовувати residential proxy до перевірки direct Scrapling fetch.
- Не робити proxy retry після звичайного parse failure без ознак блокування.
- Не переносити всі store selectors у Python без fixtures.
- Не приймати adaptive match без validation.
- Не дозволяти Scrapling service довільний URL без повторного SSRF захисту.
- Не покладатися на безкоштовні public proxy lists.
- Не додавати LLM extraction у hot path MVP: це дорожче, повільніше й не вирішує fetching/403.
- Не обіцяти 100% bypass: anti-bot — змінна система, потрібні метрики та fallback policy.

## 17. Фінальна рекомендація

Запустити lean production pilot на 3–5 проблемних доменах:

1. Залишити поточний Next scraper як безкоштовний L1.
2. Підняти один Scrapling container з HTTP impersonation і малим browser pool.
3. Купити мінімальний $5 PAYG residential credit.
4. Увімкнути proxy тільки на підтверджений IP/geo block.
5. Додати cache, quality score, fixtures, metrics і budget cap до масштабування.
6. Adaptive parsing спершу тримати в shadow mode.

Очікуваний стартовий infra budget — приблизно **$10–25/місяць для lean MVP** або **$20–80/місяць для production start**, плюс інженерна підтримка. Остаточний proxy budget треба перерахувати після отримання трьох production чисел: monthly scrape count, proxy fallback share і average transferred MB.

Ця схема дає найдешевший practical path: більшість запитів завершуються на наявному Next-рівні; Scrapling додає стійкий parsing і browser impersonation тільки для невдалих; residential proxy оплачується лише там, де дешевші рівні фактично не працюють.
