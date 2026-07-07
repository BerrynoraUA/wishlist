# Scrapling service integration

The public `/api/server/scrape-product` contract does not change. Next.js remains the primary
scraper and can call the Python service according to the configured mode.

```dotenv
SCRAPLING_SERVICE_MODE=fallback
SCRAPLING_SERVICE_URL=http://79.143.95.197:8001
SCRAPLING_SERVICE_TIMEOUT_MS=20000
SCRAPLING_SHADOW_SAMPLE_RATE=0.1
LEGACY_SCRAPER_TIMEOUT_MS=8000
```

Modes:

- `disabled`: only the existing Next.js scraper runs. This is the default.
- `shadow`: both implementations run synchronously; the legacy result is returned and only field
  differences/scores are logged. `SCRAPLING_SHADOW_SAMPLE_RATE` controls the stable URL cohort:
  `0.1` means roughly 10%, `0` disables calls, and `1` compares every request.
- `fallback`: the Python service runs when the legacy result fails its quality gate.

The Python service must be running separately:

```powershell
cd services/scraper
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

`127.0.0.1` only works when both processes run on the same machine. A hosted frontend/backend can
use the deployed scraper service URL, for example `http://79.143.95.197:8001`.

Authentication and rate limiting are intentionally not part of this milestone. Do not expose the
Python service publicly before both controls are implemented.
