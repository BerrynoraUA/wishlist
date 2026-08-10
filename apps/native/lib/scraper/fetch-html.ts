import { FETCH_HEADERS, FETCH_MAX_BYTES, FETCH_TIMEOUT_MS } from "./constants";

export type FetchHtmlResult = {
  status: number;
  html: string;
  finalUrl: string;
  error: string | null;
};

export function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export async function fetchHtml(url: string): Promise<FetchHtmlResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: FETCH_HEADERS,
    });

    const finalUrl = response.url || url;
    if (exceedsSizeLimit(response)) {
      return { status: response.status, html: "", finalUrl, error: "response_too_large" };
    }

    const body = await response.text();
    return {
      status: response.status,
      html: body.length > FETCH_MAX_BYTES ? body.slice(0, FETCH_MAX_BYTES) : body,
      finalUrl,
      error: null,
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      status: 0,
      html: "",
      finalUrl: url,
      error: aborted ? "timeout" : describeError(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function exceedsSizeLimit(response: Response): boolean {
  const contentLength = Number.parseInt(response.headers.get("content-length") ?? "", 10);
  return Number.isFinite(contentLength) && contentLength > FETCH_MAX_BYTES;
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  return String(error);
}
