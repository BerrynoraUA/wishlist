# Deploy scraper on a Linux VPS

This service is intended to run on Linux in Docker. The example `docker run` command binds the API
to `127.0.0.1:8001` on the host, so it is not publicly exposed by default.

## 1. Prepare the server

Install Docker Engine on the VPS, then clone the repository.

```bash
git clone <repo-url> wishlist
cd wishlist/services/scraper
```

## 2. Configure environment

Create the service environment file if you want to override defaults:

```bash
cp .env.example .env
```

For a normal container deploy, keep these values:

```dotenv
SCRAPER_HOST=0.0.0.0
SCRAPER_PORT=8001
SCRAPER_AUDIT_LOG_PATH=/app/.data/scrape-audit.jsonl
SCRAPER_ADAPTIVE_DB_PATH=/app/.data/adaptive.db
```

Use `.env` for timeouts, browser, adaptive extraction and Jina settings. The `docker run` command
below passes the container-specific host, audit and adaptive DB paths explicitly.

## 3. Build

```bash
docker build -t wishlane-scraper:local .
```

The first build downloads Python packages and Playwright Chromium dependencies through
`scrapling install`, so it can take a few minutes.

## 4. Start

Create a persistent Docker volume for audit logs and the adaptive SQLite DB:

```bash
docker volume create wishlane-scraper-data
```

Run the service:

```bash
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

If you do not want a `.env` file, remove `--env-file .env`; the image and command provide safe
defaults.

Check status:

```bash
docker ps --filter name=wishlane-scraper
docker logs -f wishlane-scraper
curl http://127.0.0.1:8001/health
curl http://127.0.0.1:8001/ready
```

## 5. Update after pulling changes

```bash
git pull
cd services/scraper
docker build -t wishlane-scraper:local .
docker stop wishlane-scraper
docker rm wishlane-scraper
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

## 6. Expose safely

Do not bind this service directly to `0.0.0.0` unless it is protected. Prefer one of:

- call it only from the backend on the same VPS through `http://127.0.0.1:8001`;
- put it behind nginx/Caddy with authentication, rate limiting and TLS;
- keep it on a private Docker/network/VPC address.

## Useful commands

```bash
docker logs -f wishlane-scraper
docker restart wishlane-scraper
docker stop wishlane-scraper
docker rm wishlane-scraper
docker volume ls
```
