# Rate limiting для Wishlane API, Supabase RPC і Scrapling

Дата: 29 червня 2026  
Статус: архітектурна документація, без змін production-коду

## 1. Мета

Потрібно обмежити:

1. кількість викликів `/api/server/scrape-product` одним користувачем;
2. прямі Supabase RPC-виклики з web/native клієнтів;
3. витрати дорогих внутрішніх рівнів майбутнього pipeline:
   - Scrapling HTTP без proxy;
   - Scrapling browser/stealth;
   - Scrapling із residential proxy;
4. анонімний abuse, автоматичні скрипти та випадкові request loops.

Rate limiting має:

- працювати між кількома serverless instances;
- ідентифікувати authenticated user, а не лише IP;
- повертати стандартний `429 Too Many Requests`;
- мати `Retry-After` та rate-limit headers;
- не покладатися на client-side перевірку;
- не створювати простий спосіб обійти ліміт прямим викликом Supabase;
- мати безкоштовний варіант;
- не блокувати нормальні burst-запити UI;
- окремо обмежувати кількість user requests і дорогі внутрішні ресурси.

## 2. Поточний стан Wishlane

### 2.1. Scrape endpoint

`/api/server/scrape-product` підтримує `GET` і `POST`.

Зараз:

- весь `/api` namespace обходить auth-перевірку в `apps/frontend/src/proxy.ts`;
- route сам не перевіряє Supabase user;
- native викликає endpoint без `Authorization`;
- extension викликає endpoint без `Authorization`;
- web може мати cookies, але route їх не валідує;
- GET дозволяє передавати довільний target URL у query;
- CORS allowlist містить `https://wishlane.net`, але CORS — browser policy, а не authentication;
- curl, bot або server-to-server client може викликати endpoint напряму;
- немає rate limit, quota чи user-based accounting.

Після інтеграції Scrapling цей endpoint стане фінансово чутливішим: один public request потенційно запускає Next fetch, browser і residential proxy. Тому rate limit необхідно поставити **до першого зовнішнього fetch**.

### 2.2. Supabase RPC

У web і native є багато прямих:

```ts
supabase.rpc("function_name", params);
```

Ці виклики йдуть напряму до:

```text
https://<project>.supabase.co/rest/v1/rpc/<function>
```

Вони не проходять через Next.js. Отже:

- Next middleware не може їх лімітувати;
- Vercel WAF їх не бачить;
- rate limit у React hook можна обійти;
- Supabase Auth limits захищають auth endpoints, але не є автоматичним per-user limit для ваших database RPC.

Частина RPC має `SECURITY DEFINER`. Для таких функцій особливо важливі:

- перевірка `auth.uid()`;
- правильні `GRANT EXECUTE`;
- фіксований `search_path`;
- rate limit для дорогих або mutation-операцій.

## 3. Важливо розділити три механізми

### 3.1. Rate limit

Коротке обмеження швидкості:

```text
5 scrape requests / minute / user
```

Захищає від bursts і loops.

### 3.2. Quota

Довший бюджет:

```text
100 scrape requests / day / user
```

Захищає від повільного постійного abuse, який не перевищує хвилинний limit.

### 3.3. Concurrency limit

Обмеження одночасної роботи:

```text
1 active scrape / user
10 active browsers / service
```

Навіть `5/min` не заважає користувачу одночасно запустити п'ять дорогих browser jobs. Тому для Scrapling потрібні і rate limit, і global/per-user concurrency.

## 4. Ідентифікація клієнта

Пріоритет ключа:

1. `user:<supabase_user_id>` — основний ключ;
2. `ip:<trusted_platform_ip>` — додатковий захист або anonymous flow;
3. `device:<installation_id>` — лише додатковий сигнал, не основна безпека.

Authenticated limit має рахуватися за стабільним Supabase `auth.users.id`. IP-only limit несправедливий для офісів, мобільних операторів і NAT, де багато користувачів мають одну IP.

Рекомендація для scraper-а:

```text
authenticated user limit
AND
coarse IP limit
AND
global service limit
```

Наприклад:

- 5/min на user;
- 30/min на IP;
- 300/min глобально;
- 1 active scrape на user.

IP header не можна сліпо брати з довільного `x-forwarded-for`, який може підставити клієнт. Потрібно використовувати trusted header hosting-платформи та нормалізувати першу валідну IP. User ID усе одно має бути основним ключем.

## 5. Варіанти реалізації

## Варіант A. PostgreSQL/Supabase — повністю без додаткового сервісу

### Ідея

Зберігати fixed-window counters у приватній таблиці Supabase:

```text
key                  scope             window_start         count
user:<uuid>          scrape:minute     16:20:00             4
user:<uuid>          rpc:write:minute  16:20:00             12
```

Atomic `INSERT ... ON CONFLICT DO UPDATE` гарантує правильний counter при паралельних запитах.

### Де застосувати

- Next scrape endpoint викликає internal `consume_rate_limit()` перед scraping;
- Supabase Data API використовує `pgrst.db_pre_request`;
- або окремі критичні RPC явно викликають helper на початку.

### Плюси

- $0 додаткової підписки;
- Supabase уже використовується;
- counters спільні для всіх Next instances і клієнтів;
- atomic operations;
- одна система ідентичності через `auth.uid()`;
- можна централізовано лімітувати direct RPC.

### Мінуси

- кожен контроль створює DB read/write;
- rate limiting конкурує з основним workload за Postgres resources;
- fixed-window допускає burst на межі хвилин;
- cleanup старих buckets;
- DB outage змушує обрати fail-open або fail-closed;
- глобальний `db_pre_request` треба впроваджувати обережно, щоб не заблокувати migrations, service jobs або read-heavy UI.

### Коли обрати

Найкращий безкоштовний MVP для Wishlane, особливо для direct Supabase RPC. При помірному трафіку його достатньо.

## Варіант B. Upstash Redis

### Ідея

Next route або Supabase Edge Function виконує Redis-based limiter. Підходять:

- fixed window;
- sliding window;
- token bucket.

Redis оптимізований для атомарних counters і TTL. Supabase офіційно показує Upstash як serverless-compatible спосіб rate limiting Edge Functions.

### Поточна вартість

На дату документації Upstash Free включає:

- $0/місяць;
- 500 000 commands/місяць;
- 256 MB;
- 10 GB bandwidth.

PAYG: $0.20 за 100 000 commands. Один logical rate-limit check може використовувати більше однієї Redis command, залежно від алгоритму та SDK.

Джерела:

- [Supabase: Rate Limiting Edge Functions](https://supabase.com/docs/guides/functions/examples/rate-limiting)
- [Upstash Redis pricing](https://upstash.com/pricing)

### Плюси

- також може бути безкоштовним для малого production workload;
- низька latency;
- TTL очищує buckets автоматично;
- sliding window/token bucket точніші;
- не навантажує основну Supabase DB;
- добре працює із Vercel/serverless;
- зручно для concurrency locks і single-flight.

### Мінуси

- ще один зовнішній сервіс і secrets;
- free tier не має production SLA/Prod Pack;
- не бачить direct Supabase RPC, якщо клієнт викликає їх напряму;
- щоб захистити RPC через Redis, потрібно:
  - перевести їх за Next/Edge gateway; або
  - додати limiter у кожну Edge Function;
- мережевий dependency перед кожним request.

### Коли обрати

Найкращий runtime limiter для scrape endpoint і Scrapling. Не є повним рішенням для поточної direct-RPC архітектури без додаткової міграції.

## Варіант C. Vercel WAF Rate Limiting

### Ідея

Створити WAF rule на:

```text
/api/server/scrape-product
```

Запит блокується на edge до виконання Next function.

На дату документації Vercel публікує ціну `$0.50 / 1,000,000 allowed requests` для WAF Rate Limiting; доступність можливостей також залежить від plan.

Джерело: [Vercel WAF usage and pricing](https://vercel.com/docs/vercel-firewall/vercel-waf/usage-and-pricing).

### Плюси

- блокує до запуску compute;
- просте operational керування;
- сильний IP/path abuse layer;
- не потребує власної counter table.

### Мінуси

- не захищає direct Supabase RPC;
- edge зазвичай краще знає IP, ніж application user ID;
- user/subscription-aware limits усе одно потребують application logic або SDK;
- platform lock-in;
- не замінює daily quota та внутрішній proxy budget.

### Коли обрати

Як додатковий зовнішній IP-level shield, а не як єдиний limiter.

## Варіант D. Supabase Edge Function як єдиний API gateway

### Ідея

Клієнти більше не викликають database RPC напряму. Вони викликають Edge Functions:

```text
Client → Supabase Edge Function → limiter → database RPC
```

Limiter може використовувати Upstash або Postgres.

### Плюси

- один gateway для web і native;
- повний контроль user-aware limits;
- можна приховати internal RPC;
- однакові headers і 429 behavior;
- добре для дорогих mutations.

### Мінуси

- значна міграція поточного API;
- додатковий network hop;
- треба підтримувати Edge Functions і contracts;
- не потрібно проксувати всі дешеві reads без причини;
- Supabase platform limits все одно не є вашою product-level quota.

### Коли обрати

Для довгострокової three-tier architecture або лише для sensitive/expensive operations.

## Варіант E. In-memory Map у Next/Scrapling

### Ідея

```ts
Map<userId, { count; resetAt }>;
```

### Плюси

- безкоштовно;
- дуже швидко;
- легко зробити для local development.

### Мінуси

- кожна serverless instance має власний counter;
- cold start скидає limits;
- deploy скидає state;
- користувач обходить limit, потрапляючи на іншу instance;
- не захищає direct RPC;
- memory cleanup.

### Висновок

Не використовувати як production security control. Допустимо лише як додатковий локальний fast-path або dev stub.

## 6. Порівняння

| Варіант               |       Додаткова ціна |        User-based |          Direct RPC | Serverless-safe |      Точність |     Складність |
| --------------------- | -------------------: | ----------------: | ------------------: | --------------: | ------------: | -------------: |
| Supabase Postgres     |            $0 окремо |               так |                 так |             так |         добра |        середня |
| Upstash Free          |          $0 до quota |               так |     ні, без gateway |             так |        висока | низька/середня |
| Vercel WAF            |           usage/plan | переважно IP/path |                  ні |             так | добра на edge |         низька |
| Supabase Edge gateway | Edge usage + storage |               так | так, після міграції |             так |        висока |         висока |
| In-memory             |                   $0 |     формально так |                  ні |              ні |        низька |         низька |

## 7. Рекомендована архітектура для Wishlane

### 7.1. Рекомендований lean/free старт

```text
Scrape endpoint
  → Supabase Auth validation
  → Postgres limiter RPC
  → Next/Scrapling pipeline

Direct Supabase RPC
  → PostgREST db_pre_request
  → per-user/per-function Postgres counter
  → business RPC
```

Це не потребує нового платного сервісу.

### 7.2. Рекомендований production upgrade

```text
Internet abuse
  → Vercel WAF coarse IP/path rule (optional)

Scrape endpoint
  → Auth
  → Upstash user/IP minute limiter
  → Postgres daily quota
  → Next/Scrapling
  → internal browser/proxy budget limiter

Direct Supabase RPC
  → Postgres db_pre_request/function-level limiter
```

Чому hybrid:

- Redis краще для частих minute counters, TTL, locks і concurrency;
- Postgres потрібен для direct RPC і довгих product quotas;
- WAF корисний для дешевого блокування грубого bot traffic;
- жоден один шар не бачить усі поточні шляхи Wishlane.

## 8. Рекомендовані ліміти

Це стартові значення, не остаточні. Спочатку потрібно 7–14 днів записувати метрики в observe-only режимі.

### 8.1. Scraping

| Scope                      |                        Limit | Причина                     |
| -------------------------- | ---------------------------: | --------------------------- |
| Authenticated user         |                        5/min | захист від paste loop       |
| Authenticated user         |                      30/hour | обмеження sustained usage   |
| Free user                  |                      100/day | контроль proxy/browser cost |
| Premium user               |                  300–500/day | product entitlement         |
| IP                         |                       30/min | multiple accounts/bots      |
| User concurrency           |                            1 | один активний scrape        |
| Global browser concurrency | залежить від RAM, напр. 4–10 | захист Scrapling service    |
| Global proxy attempts      |       daily dollar/GB budget | фінансовий запобіжник       |

Якщо нормальний UX справді потребує більше п'яти paste operations за хвилину, краще token bucket із capacity 8 і refill 5/min, а не жорсткий fixed window.

### 8.2. RPC-категорії

Не ставити один малий limit на всі RPC: відкриття home screen може паралельно викликати кілька read functions.

| Категорія            | Приклади                                   |                       Стартовий limit |
| -------------------- | ------------------------------------------ | ------------------------------------: |
| Cheap reads          | feeds, counts, details                     |                          120/min/user |
| Search               | profile/search endpoints                   |                           30/min/user |
| Normal writes        | toggle, update, CRUD                       |                           30/min/user |
| Sensitive writes     | share token, access grants, friend request |                           10/min/user |
| Notification fan-out | notify friends                             |                   3/min/user і 20/day |
| Account/destructive  | delete account                             |                           2/hour/user |
| Public token reads   | shared wishlist                            | 60/min/IP + token-specific safeguards |

Окрім rate limit, mutation RPC повинні бути idempotent там, де можливо.

### 8.3. Weighted Scrapling budget

Один user request рахується як один scrape незалежно від fallback. Окремо service рахує internal cost:

| Рівень                    | Cost units |
| ------------------------- | ---------: |
| Cache hit                 |          0 |
| Next direct fetch         |          1 |
| Scrapling HTTP no-proxy   |          1 |
| Browser/stealth no-proxy  |          3 |
| Residential proxy HTTP    |          5 |
| Residential proxy browser |         10 |

Приклад:

```text
user scrape limit: 5/min
user expensive budget: 30 units/hour
global proxy budget: 5 GB or $5/day
```

Це не дозволяє одному користувачу витратити весь proxy budget, навіть якщо він формально не перевищує 5 requests/min.

## 9. Authentication scraper endpoint

Rate limiting per user неможливий без перевіреної user identity.

### Web

Web request може використовувати Supabase auth cookies. Route створює server client і викликає:

```ts
await supabase.auth.getUser();
```

### Native

Native має передати access token:

```http
Authorization: Bearer <supabase_access_token>
```

### Extension

Extension уже має auth/session logic, тому `SCRAPE_URL` має додати access token у server request.

### Важливі правила

- route сам валідує user; не покладається на page middleware;
- internal Scrapling service не приймає public Supabase token як довіру;
- Next → Scrapling використовує окремий internal HMAC/service credential;
- GET бажано прибрати й залишити POST, щоб URL не потрапляв у query logs/cache/history;
- CORS залишити, але не вважати security control;
- unauthenticated requests — `401`, а не anonymous expensive scraping.

Якщо потрібен scraping до login, дати дуже малий IP/device limit, CAPTCHA/Turnstile і не дозволяти proxy browser tier.

## 10. Безкоштовна PostgreSQL-реалізація

Нижче — reference design, який потрібно оформити окремою migration після review.

### 10.1. Private schema і counters

```sql
create schema if not exists private;

create table if not exists private.rate_limit_counters (
  subject text not null,
  scope text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (subject, scope, window_start)
);

revoke all on schema private from public, anon, authenticated;
revoke all on private.rate_limit_counters from public, anon, authenticated;
```

Один bucket = один рядок на subject/scope/window. Це дешевше за зберігання одного event row на кожний request.

### 10.2. Atomic consume helper

```sql
create or replace function private.consume_fixed_window(
  p_subject text,
  p_scope text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  current_count integer,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_count integer;
begin
  if p_limit <= 0 or p_window_seconds <= 0 then
    raise exception 'Invalid rate limit configuration';
  end if;

  v_window_start :=
    to_timestamp(
      floor(extract(epoch from v_now) / p_window_seconds)
      * p_window_seconds
    );

  insert into private.rate_limit_counters (
    subject,
    scope,
    window_start,
    request_count,
    updated_at
  )
  values (
    p_subject,
    p_scope,
    v_window_start,
    1,
    v_now
  )
  on conflict (subject, scope, window_start)
  do update
    set request_count = private.rate_limit_counters.request_count + 1,
        updated_at = excluded.updated_at
  returning request_count into v_count;

  return query
  select
    v_count <= p_limit,
    v_count,
    greatest(p_limit - v_count, 0),
    v_window_start + make_interval(secs => p_window_seconds);
end;
$$;

revoke all on function private.consume_fixed_window(text, text, integer, integer)
  from public, anon, authenticated;
```

Helper не повинен бути напряму доступний клієнту з довільними `p_limit` і `p_scope`.

### 10.3. Public/server wrapper для scraper-а

Безпечніше викликати wrapper із server-side service role, передаючи вже перевірений user ID:

```sql
create or replace function public.consume_scrape_rate_limit(
  p_user_id uuid
)
returns table (
  allowed boolean,
  current_count integer,
  remaining integer,
  reset_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select *
  from private.consume_fixed_window(
    'user:' || p_user_id::text,
    'scrape:minute',
    5,
    60
  );
$$;

revoke all on function public.consume_scrape_rate_limit(uuid)
  from public, anon, authenticated;
grant execute on function public.consume_scrape_rate_limit(uuid)
  to service_role;
```

Next route:

1. валідує JWT/cookie через user-scoped client;
2. отримує `user.id`;
3. server-only admin client викликає wrapper;
4. при `allowed=false` повертає 429;
5. не запускає scraping.

Не приймати `user_id` із request body.

### 10.4. PostgREST pre-request для RPC

Supabase підтримує:

```sql
alter role authenticator
  set pgrst.db_pre_request = 'public.check_request_rate_limit';

notify pgrst, 'reload config';
```

Function може читати:

- `auth.uid()`;
- `request.method`;
- `request.path`;
- `request.headers`;
- JWT.

Офіційне обмеження: DB pre-request працює лише для Data API/PostgREST, не для Realtime, Storage та Auth. Supabase також зазначає, що write-based rate limiting не застосовується до `GET/HEAD`, бо вони можуть виконуватися у read-only mode. RPC через `supabase.rpc()` зазвичай є `POST /rest/v1/rpc/...`, тому цей механізм підходить для них.

Джерело: [Supabase: Securing your API](https://supabase.com/docs/guides/api/securing-your-api).

Reference outline:

```sql
create or replace function public.check_request_rate_limit()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_method text := current_setting('request.method', true);
  v_path text := current_setting('request.path', true);
  v_scope text;
  v_limit integer;
  v_result record;
begin
  -- Не лімітувати trusted service jobs цим user policy.
  if auth.role() = 'service_role' then
    return;
  end if;

  -- Спочатку обмежуємо тільки RPC, а не весь Data API.
  if v_method <> 'POST' or ltrim(v_path, '/') not like 'rpc/%' then
    return;
  end if;

  if v_user_id is null then
    raise sqlstate 'PGRST' using
      message = '{"code":"unauthorized","message":"Authentication required"}',
      detail = '{"status":401}';
  end if;

  -- Реальну категоризацію краще винести у private config table
  -- або CASE по конкретних allowlisted function names.
  v_scope := 'rpc:all:minute';
  v_limit := 120;

  select *
  into v_result
  from private.consume_fixed_window(
    'user:' || v_user_id::text,
    v_scope,
    v_limit,
    60
  );

  if not v_result.allowed then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code', 'rate_limit_exceeded',
        'message', 'Too many requests'
      )::text,
      detail = json_build_object(
        'status', 429,
        'headers', json_build_object(
          'Retry-After',
          greatest(
            ceil(extract(epoch from (v_result.reset_at - clock_timestamp()))),
            1
          )::text
        )
      )::text;
  end if;
end;
$$;
```

Перед production треба перевірити фактичний формат `request.path` у staging logs. Не вмикати глобальний hook із неперевіреним path parsing.

### 10.5. Важливий transaction нюанс

Якщо counter increment і `RAISE` виконуються в одній транзакції, зміни поточного заблокованого request rollback-нуться. Це нормально, якщо:

- перші `limit` дозволених requests уже записані;
- наступний request increment-ить до `limit + 1`;
- `RAISE` rollback-ить його назад до `limit`;
- подальші requests знову визначаються як blocked.

Не будувати analytics на кількості blocked attempts у цій самій transaction. Blocked attempts краще рахувати в external logs/metrics.

### 10.6. Cleanup

```sql
delete from private.rate_limit_counters
where window_start < now() - interval '2 days';
```

Виконувати через `pg_cron`, наприклад щогодини. Daily/monthly quota buckets потребують довшого retention.

### 10.7. Config table

Щоб не hardcode-ити всі RPC:

```sql
create table private.rate_limit_policies (
  scope text primary key,
  path_pattern text not null,
  methods text[] not null default array['POST'],
  max_requests integer not null,
  window_seconds integer not null,
  enabled boolean not null default true
);
```

Однак dynamic regex/config lookup на кожний request теж має ціну. Для десятків RPC простий indexed exact function mapping або `CASE` може бути швидшим і прозорішим.

## 11. Upstash-реалізація для scraper-а

Прикладова структура Next helper:

```ts
type RateLimitDecision = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};
```

Key:

```ts
const key = `wishlane:ratelimit:scrape:user:${user.id}`;
```

Окремий IP key:

```ts
const ipKey = `wishlane:ratelimit:scrape:ip:${hash(ip)}`;
```

Не зберігати raw IP, якщо вона не потрібна; можна використовувати HMAC hash із server secret.

Алгоритм:

- token bucket для user UX;
- fixed/sliding window для coarse IP abuse;
- Redis lock `scrape:active:<userId>` із TTL для concurrency;
- separate counter `scrape:cost:<userId>:<hour>`;
- global proxy budget counter.

Fail policy:

- minute limiter unavailable:
  - authenticated existing users: короткочасно fail-open із conservative local fallback;
  - anonymous/expensive proxy tier: fail-closed;
- daily quota unavailable: proxy tier fail-closed;
- завжди log provider failure.

## 12. HTTP behavior

При перевищенні:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 23
RateLimit-Limit: 5
RateLimit-Remaining: 0
RateLimit-Reset: 23
Cache-Control: no-store
Content-Type: application/json
```

```json
{
  "error": {
    "code": "rate_limit_exceeded",
    "message": "Too many scraping requests. Try again in 23 seconds.",
    "retryAfterSeconds": 23
  }
}
```

Не повертати внутрішні дані:

- provider;
- counter key;
- proxy budget;
- subscription implementation;
- IP hash.

Клієнт повинен:

- показати зрозуміле повідомлення;
- вимкнути повторну кнопку на `Retry-After`;
- не робити automatic immediate retry на 429;
- додати jitter до background retry;
- не трактувати 429 як “парсинг сайту не працює”.

## 13. Порядок перевірок scrape endpoint

```text
1. Method/content-type/body-size validation
2. Authentication
3. Coarse IP limiter
4. User minute limiter
5. User daily quota
6. URL normalization + SSRF validation
7. Cache lookup
8. Per-user single-flight/concurrency lock
9. Next direct scrape
10. Scrapling no-proxy budget check
11. Browser capacity check
12. Proxy user/global cost budget check
13. Result + metrics
14. Release lock
```

Можлива оптимізація: verified cache hit може коштувати нуль daily scrape quota або окрему дешеву quota. Але basic anti-abuse minute limit має виконуватися навіть перед cache, щоб endpoint не використовували для flood.

Lock обов'язково має TTL, інакше crash залишить user заблокованим назавжди.

## 14. RPC strategy для Wishlane

### 14.1. Не лімітувати все однаково

Поточні RPC включають:

- feeds і pagination;
- unread counters;
- searches;
- toggles;
- access grants;
- friend requests;
- share tokens;
- Secret Santa operations;
- notification fan-out;
- account deletion.

Один limit `20/min` зламає normal app boot. Один `500/min` не захистить дорогі mutations.

### 14.2. Рекомендована категоризація

```text
rpc:read
rpc:search
rpc:write
rpc:sensitive
rpc:notification
rpc:destructive
```

Pre-request hook визначає category за exact RPC name. Додатково найбільш критичні `SECURITY DEFINER` functions самі можуть викликати function-level limiter. Defense in depth потрібен для:

- notification fan-out;
- share token generation;
- wishlist access changes;
- friend requests;
- Secret Santa invitation operations;
- account deletion.

### 14.3. Function-level helper

Function-level check корисний, якщо RPC можуть викликати не лише через PostgREST. Але треба врахувати різні return types. Найчистіші варіанти:

1. pre-request hook повертає 429 централізовано;
2. critical RPC повертає structured result із `rate_limited`;
3. критичні operations перенести в Edge/Next gateway.

Не вставляти `consume` у RLS policy для кожного рядка: Supabase попереджає, що function у RLS може виконуватися багато разів і погіршити performance.

## 15. Subscription-aware limits

Ліміти можуть залежати від plan:

```text
free:    5/min, 100/day
premium: 10/min, 500/day
admin:   internal policy
```

Не довіряти `plan` із request body. Джерела:

- trusted JWT custom claim, якщо lifecycle claims надійно оновлюється;
- server-side subscription lookup/cache;
- private entitlement table.

Для Postgres limiter зручно читати entitlement за `auth.uid()`, але не робити складний multi-table query на кожний дешевий RPC. Plan limits можна cache-ити або мати denormalized policy key.

Service role не повинен автоматично означати “безлімітний зовнішній user”. Обхід дозволений лише для відомих internal jobs; якщо service route діє від імені користувача, він має застосувати user quota вручну.

## 16. Observability

Метрики:

- allowed/blocked за scope;
- user/IP/global blocks;
- p50/p95 limiter latency;
- Postgres counter table size;
- Redis commands/month;
- 429 response rate;
- top RPC category, але без витоку sensitive params;
- concurrent scrapes/browser jobs;
- Scrapling cost units;
- proxy bytes і spend;
- fail-open/fail-closed events;
- false positives/support complaints.

Не логувати:

- access token;
- raw Authorization;
- повний URL товару, якщо query може містити identifiers/tokens;
- raw IP без retention/privacy policy.

Alerts:

- 429 >5% normal authenticated traffic;
- limiter dependency errors;
- global proxy budget 70%/90%;
- один user/IP створює аномальну частку traffic;
- counter cleanup не виконувався;
- Redis наближається до free command quota.

## 17. Тестування

### Unit

- перші N requests дозволені;
- N+1 отримує block;
- reset після window;
- різні users мають незалежні buckets;
- різні scopes незалежні;
- premium/free limits;
- malformed forwarded headers;
- service role bypass тільки для internal cases.

### Concurrency

- 20 одночасних requests одному user;
- atomic counter не пропускає більше limit;
- single-flight дозволяє один active scrape;
- crash/timeout звільняється через lock TTL.

### Integration

- web cookie auth;
- native bearer auth;
- extension bearer auth;
- direct unauthenticated scrape → 401;
- direct Supabase RPC over limit → 429;
- response headers;
- client не retry-ить 429 одразу.

### Security

- spoofed user ID;
- spoofed `x-forwarded-for`;
- JWT іншого Supabase project;
- expired JWT;
- parallel IP/user key evasion;
- GET/POST bypass;
- RPC alias/path parsing;
- service-role endpoint leakage.

### Load

- normal home screen burst;
- pagination/search typing;
- 1k concurrent scrape attempts;
- limiter DB/Redis latency;
- behavior під час Supabase/Redis outage.

## 18. Rollout

### Етап 1. Observe only

1. Додати authentication extraction і request identity metrics.
2. Рахувати “would block”, але не блокувати.
3. Зібрати 7–14 днів p95/p99 usage за RPC category/user.
4. Визначити реальний normal burst.

### Етап 2. Захист scraper-а

1. Залишити тільки POST.
2. Додати auth для web/native/extension.
3. Увімкнути 5/min + 30/hour + concurrency 1.
4. Додати daily quota.
5. Додати cost-unit budget перед browser/proxy.

### Етап 3. Critical RPC

Першими обмежити:

- notification fan-out;
- share/access mutation;
- search;
- destructive/account operations.

### Етап 4. Global RPC pre-request

1. Staging із exact path mapping.
2. Allowlist internal roles/jobs.
3. 5%/25%/100% rollout, якщо можливо.
4. Per-category tuning.

### Етап 5. Redis/WAF upgrade

Додавати лише якщо:

- Postgres limiter створює помітне DB load;
- потрібен точніший sliding window;
- потрібні distributed locks;
- abuse доходить до Next compute;
- free Upstash quota економічно виправдана.

## 19. Ризики

| Ризик                                    | Наслідок                       | Захист                                      |
| ---------------------------------------- | ------------------------------ | ------------------------------------------- |
| Scraper лишився unauthenticated          | user limit неможливий          | auth у самому route                         |
| CORS вважається auth                     | curl обходить захист           | JWT/cookie validation                       |
| Limit лише в Next                        | direct RPC не захищені         | Postgres pre-request/function checks        |
| Один limit для всіх RPC                  | UI отримує false 429           | category policies                           |
| IP-only                                  | NAT users блокують одне одного | user ID primary                             |
| In-memory у serverless                   | inconsistent limits            | Postgres/Redis                              |
| Counter race                             | limit перевищується            | atomic UPSERT/Lua                           |
| DB limiter перевантажує DB               | app slowdown                   | bucket rows, indexes, Redis upgrade         |
| `service_role` bypass abuse              | unlimited expensive calls      | internal-only credential, manual user quota |
| Redis outage                             | endpoint behavior невизначений | documented fail policy                      |
| Retry на 429                             | request storm                  | `Retry-After`, client cooldown              |
| Proxy cost не пов'язаний з request count | фінансовий abuse               | weighted internal budget                    |

## 20. Остаточна рекомендація

### Найдешевший варіант

Використати Supabase PostgreSQL:

- fixed-window counter table у `private`;
- server-only wrapper для scrape endpoint;
- `pgrst.db_pre_request` для direct RPC;
- окремі stricter policies для critical RPC;
- `pg_cron` cleanup;
- auth обов'язковий для scraper-а.

Додаткова сервісна вартість: **$0**, але є невелике додаткове навантаження на вже оплачувану Supabase DB.

### Найкращий практичний варіант

- **Upstash Free** для scrape minute limits, concurrency та Scrapling budgets;
- **Supabase Postgres** для direct RPC і daily/product quotas;
- optional **Vercel WAF** для грубого IP abuse до запуску function.

Почати з observe-only метрик, а не одразу з випадкових жорстких значень. Перший production target:

```text
scrape: 5/min + 30/hour + 100/day/free user
scrape concurrency: 1/user
RPC reads: 120/min
RPC writes: 30/min
sensitive RPC: 10/min
notification fan-out: 3/min + 20/day
```

Головна архітектурна вимога перед Scrapling: жоден неавторизований public request не повинен мати можливість запустити browser або residential proxy.

## 21. Офіційні джерела

- [Supabase Data REST API](https://supabase.com/docs/guides/api)
- [Supabase: Securing your API та `pgrst.db_pre_request`](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase: Rate Limiting Edge Functions](https://supabase.com/docs/guides/functions/examples/rate-limiting)
- [Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits)
- [Upstash Redis pricing](https://upstash.com/pricing)
- [Vercel WAF usage and pricing](https://vercel.com/docs/vercel-firewall/vercel-waf/usage-and-pricing)
