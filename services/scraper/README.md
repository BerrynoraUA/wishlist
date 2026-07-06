# Wishlane scraper service

Python service responsible for fetching and extracting product data. The first implementation
milestone defines the service contract; fetching and extraction are added in subsequent milestones.

## Requirements

- Python 3.12

## Setup

```powershell
cd services/scraper
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
scrapling install
```

Copy `.env.example` to `.env` if local overrides are needed.

## Run

From the repository root:

```powershell
pnpm scrapling
```

The command prefers `services/scraper/.venv`, then falls back to an installed Python 3.12.
`SCRAPER_HOST`, `SCRAPER_PORT`, and `SCRAPER_LOG_LEVEL` are read from the service environment.

The equivalent direct command from `services/scraper` is:

```powershell
python -m app
```

The default host is deliberately loopback-only. Do not expose this service publicly without
authentication and rate limiting.

## Scrape audit log

Every completed `/v1/scrape` call writes one JSON object per line to
`.data/scrape-audit.jsonl`. Each event contains the request ID, sanitized product URL, attempted
fetch modes, status and block reason for every attempt, timing, parse quality, selected mode, and
the final outcome. Query strings, URL credentials, response HTML, product contents, and proxy
credentials are not logged.

```dotenv
SCRAPER_AUDIT_LOG_PATH=.data/scrape-audit.jsonl
SCRAPER_AUDIT_LOG_MAX_BYTES=20971520
SCRAPER_AUDIT_LOG_BACKUPS=5
```

When the active file reaches the configured size it rotates to `.1`, then `.2`, up to the backup
limit.

## Test

```powershell
python -m pytest
```

## Endpoints

- `GET /health`: process liveness.
- `GET /ready`: configuration readiness.
- `POST /v1/scrape`: fetches a public product URL with a persistent browser-impersonating HTTP
  session and returns normalized product data.
- `POST /v1/api-fetch`: retries an allowlisted marketplace JSON API through direct HTTP and then
  HTTP proxy. It does not use browser, HTML parsing, or Jina, and accepts only restricted headers.

The HTTP session uses Scrapling's Chrome TLS impersonation and matching browser headers. When the
HTTP response is blocked or incomplete, the service lazily starts a shared stealth Chromium session.
When proxy support is enabled, a confirmed block can escalate to separate proxied HTTP and browser
sessions. One provider endpoint and a Scrapling-rotated list are both supported. Adaptive fallback
stores validated element fingerprints in the configured SQLite file. Adaptive prices are never
accepted without confirmation from an independent extraction source.

`SCRAPER_ENABLE_JINA=true` enables Jina Reader only as the last tier after direct HTTP, direct
browser, proxy HTTP and proxy browser. Its output must contain a product identifier from the
requested URL and is logged as `jina_reader`.
