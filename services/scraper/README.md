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
the final outcome. Query strings, URL credentials, response HTML, and product contents are not
logged.

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
- `POST /v1/api-fetch`: fetches an allowlisted marketplace JSON API through direct HTTP. It does
  not use browser or HTML parsing and accepts only restricted headers.

The HTTP session uses Scrapling's Chrome TLS impersonation and matching browser headers. When the
HTTP response is blocked or incomplete, the service lazily starts a shared stealth Chromium session.
Adaptive fallback stores validated element fingerprints in the configured SQLite file. Adaptive
prices are never accepted without confirmation from an independent extraction source.

`SCRAPER_ENABLE_JINA=true` enables Jina Reader as the final fallback after Scrapling HTTP and
Scrapling browser attempts.

## Docker deploy

For a Linux VPS/container deploy:

```bash
cd services/scraper
cp .env.example .env
docker build -t wishlane-scraper:local .
docker volume create wishlane-scraper-data
docker run -d \
  --name wishlane-scraper \
  --restart unless-stopped \
  --init \
  --shm-size=1g \
  --env-file .env \
  -e SCRAPER_HOST=0.0.0.0 \
  -e SCRAPER_PORT=8001 \
  -e SCRAPER_AUDIT_LOG_PATH=/app/.data/scrape-audit.jsonl \
  -e SCRAPER_ADAPTIVE_DB_PATH=/app/.data/adaptive.db \
  -p 127.0.0.1:8001:8001 \
  -v wishlane-scraper-data:/app/.data \
  wishlane-scraper:local
```

The Docker run command binds the service to `127.0.0.1:8001` on the host by default. See `DEPLOY.md`
for the full VPS checklist.
