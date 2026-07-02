/**
 * Tier-3 fallback: fetch the page through FlareSolverr, which drives a real
 * browser to solve Cloudflare / anti-bot challenges and returns the resulting
 * HTML. scrapeProduct then re-runs the metadata + store extractors on it.
 *
 * Enable by pointing FLARESOLVERR_URL at a running FlareSolverr instance, e.g.
 * http://localhost:8191/v1. Run it yourself (free, self-hosted):
 *
 *   docker run -d --name flaresolverr --restart unless-stopped \
 *     -p 8191:8191 -e LOG_LEVEL=info \
 *     ghcr.io/flaresolverr/flaresolverr:latest
 *
 * When FLARESOLVERR_URL is unset, or the request fails/times out, this returns
 * null so the pipeline degrades gracefully (Tiers 1-2 still work).
 */

interface FlareSolverrResult {
  status?: string;
  message?: string;
  solution?: {
    status?: number;
    response?: string;
  };
}

// How long FlareSolverr may spend solving the challenge, plus a small buffer
// for our own request to it.
const SOLVE_TIMEOUT_MS = 55_000;
const REQUEST_TIMEOUT_MS = SOLVE_TIMEOUT_MS + 5_000;

export async function renderWithHeadlessBrowser(url: string): Promise<string | null> {
  const endpoint = process.env.FLARESOLVERR_URL;
  if (!endpoint) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cmd: "request.get",
        url,
        maxTimeout: SOLVE_TIMEOUT_MS,
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const data = (await response.json()) as FlareSolverrResult;
    if (data.status !== "ok" || !data.solution?.response) return null;

    return data.solution.response;
  } catch (error) {
    console.error("FlareSolverr request failed:", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
