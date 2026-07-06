import "server-only";

import type { ProductData } from "./helpers/types";

export type ScraplingMode = "disabled" | "shadow" | "fallback";

type ScraplingQuality = {
  score: number;
  accepted: boolean;
  warnings: string[];
};

export type ScraplingDiagnostics = {
  fetch_mode: string;
  selected_fetch_mode: string | null;
  status: number | null;
  attempts: ScraplingAttempt[];
  elapsed_ms: number;
  parser_sources: Record<string, string>;
};

export type ScraplingAttempt = {
  sequence: number;
  mode: string;
  purpose: string;
  outcome: string;
  duration_ms: number;
  status?: number | null;
  block_reason?: string | null;
  error?: string | null;
  parse_score?: number | null;
  parse_accepted?: boolean | null;
  selected: boolean;
};

export type ScraplingResponse = {
  product: ProductData;
  quality: ScraplingQuality;
  diagnostics: ScraplingDiagnostics;
};

export type ScraplingRequestResult = {
  response: ScraplingResponse | null;
  errorCode?: string;
  errorMessage?: string;
  status?: number;
  diagnostics?: ScraplingDiagnostics;
};

const DEFAULT_SERVICE_URL = "http://127.0.0.1:8001";
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_SHADOW_SAMPLE_RATE = 0.1;

export function getScraplingMode(): ScraplingMode {
  const value = process.env.SCRAPLING_SERVICE_MODE?.trim().toLowerCase();
  if (value === "disabled" || value === "shadow") return value;
  return "fallback";
}

export function shouldSampleScraplingShadow(url: string): boolean {
  const configuredRate = Number(process.env.SCRAPLING_SHADOW_SAMPLE_RATE);
  const rate =
    Number.isFinite(configuredRate) && configuredRate >= 0 && configuredRate <= 1
      ? configuredRate
      : DEFAULT_SHADOW_SAMPLE_RATE;
  if (rate === 0) return false;
  if (rate === 1) return true;

  // Stable FNV-1a sampling keeps the same URL in the same cohort across requests.
  let hash = 0x811c9dc5;
  for (let index = 0; index < url.length; index += 1) {
    hash ^= url.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 0x1_0000_0000 < rate;
}

export async function scrapeWithScrapling(url: string): Promise<ScraplingResponse | null> {
  return (await scrapeWithScraplingResult(url)).response;
}

export async function scrapeWithScraplingResult(url: string): Promise<ScraplingRequestResult> {
  const serviceUrl = (process.env.SCRAPLING_SERVICE_URL?.trim() || DEFAULT_SERVICE_URL).replace(
    /\/$/,
    "",
  );
  const configuredTimeout = Number(process.env.SCRAPLING_SERVICE_TIMEOUT_MS);
  const timeoutMs =
    Number.isFinite(configuredTimeout) && configuredTimeout >= 1_000
      ? Math.min(configuredTimeout, 60_000)
      : DEFAULT_TIMEOUT_MS;

  try {
    const response = await fetch(`${serviceUrl}/v1/scrape`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        request_id: crypto.randomUUID(),
        deadline_ms: Math.max(timeoutMs - 500, 1_000),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      console.warn("[scrapling] request failed", { status: response.status });
      const payload: unknown = await response.json().catch(() => null);
      const error =
        isRecord(payload) && isRecord(payload.error)
          ? {
              errorCode: typeof payload.error.code === "string" ? payload.error.code : undefined,
              errorMessage:
                typeof payload.error.message === "string" ? payload.error.message : undefined,
              diagnostics: parseScraplingDiagnostics(payload.error.diagnostics),
            }
          : {};
      return { response: null, status: response.status, ...error };
    }

    const payload: unknown = await response.json();
    return { response: parseScraplingResponse(payload) };
  } catch (error) {
    console.warn("[scrapling] service unavailable", {
      reason: error instanceof Error ? error.name : "unknown",
    });
    return {
      response: null,
      errorMessage: error instanceof Error ? error.message : "Scrapling service unavailable",
    };
  }
}

export function scoreProduct(product: ProductData | null): number {
  if (!product) return 0;
  let score = 0;
  const title = product.title?.trim() ?? "";
  if (title && !/^(access denied|forbidden|just a moment)$/i.test(title)) score += 25;
  if (isValidPrice(product.price)) score += 30;
  if (product.currency) score += 10;
  if (isValidImage(product.image)) score += 20;
  if (product.description) score += 5;
  return score;
}

export function isAcceptableProduct(product: ProductData | null): boolean {
  return Boolean(
    product?.title?.trim() && isValidPrice(product.price) && isValidImage(product.image),
  );
}

export function logShadowComparison(
  legacy: ProductData | null,
  scrapling: ScraplingResponse,
): void {
  const differingFields = (
    [
      "title",
      "description",
      "image",
      "price",
      "discount_price",
      "has_discount",
      "discount_end_date",
      "currency",
    ] as const
  ).filter((field) => legacy?.[field] !== scrapling.product[field]);

  console.info("[scrapling] shadow comparison", {
    legacyScore: scoreProduct(legacy),
    scraplingScore: scrapling.quality.score,
    scraplingAccepted: scrapling.quality.accepted,
    fetchMode: scrapling.diagnostics.fetch_mode,
    differingFields,
  });
}

function parseScraplingResponse(value: unknown): ScraplingResponse | null {
  if (!isRecord(value) || !isRecord(value.product)) return null;
  const product = parseProduct(value.product);
  if (!product || !isRecord(value.quality) || !isRecord(value.diagnostics)) return null;

  const score = value.quality.score;
  const accepted = value.quality.accepted;
  const warnings = value.quality.warnings;
  const diagnostics = parseScraplingDiagnostics(value.diagnostics);
  if (
    typeof score !== "number" ||
    !Number.isFinite(score) ||
    typeof accepted !== "boolean" ||
    !Array.isArray(warnings) ||
    !warnings.every((warning) => typeof warning === "string") ||
    diagnostics === undefined
  ) {
    return null;
  }

  return {
    product,
    quality: { score, accepted, warnings },
    diagnostics,
  };
}

function parseScraplingDiagnostics(value: unknown): ScraplingDiagnostics | undefined {
  if (!isRecord(value)) return undefined;
  if (
    typeof value.fetch_mode !== "string" ||
    !(value.selected_fetch_mode === null || typeof value.selected_fetch_mode === "string") ||
    !(value.status === null || typeof value.status === "number") ||
    !Array.isArray(value.attempts) ||
    typeof value.elapsed_ms !== "number" ||
    !isStringRecord(value.parser_sources)
  ) {
    return undefined;
  }
  const attempts = value.attempts.map(parseScraplingAttempt);
  if (attempts.some((attempt) => attempt === null)) return undefined;
  return {
    fetch_mode: value.fetch_mode,
    selected_fetch_mode: value.selected_fetch_mode,
    status: value.status,
    attempts: attempts as ScraplingAttempt[],
    elapsed_ms: value.elapsed_ms,
    parser_sources: value.parser_sources,
  };
}

function parseScraplingAttempt(value: unknown): ScraplingAttempt | null {
  if (
    !isRecord(value) ||
    typeof value.sequence !== "number" ||
    typeof value.mode !== "string" ||
    typeof value.purpose !== "string" ||
    typeof value.outcome !== "string" ||
    typeof value.duration_ms !== "number" ||
    typeof value.selected !== "boolean"
  ) {
    return null;
  }
  return {
    sequence: value.sequence,
    mode: value.mode,
    purpose: value.purpose,
    outcome: value.outcome,
    duration_ms: value.duration_ms,
    status: typeof value.status === "number" ? value.status : null,
    block_reason: typeof value.block_reason === "string" ? value.block_reason : null,
    error: typeof value.error === "string" ? value.error : null,
    parse_score: typeof value.parse_score === "number" ? value.parse_score : null,
    parse_accepted: typeof value.parse_accepted === "boolean" ? value.parse_accepted : null,
    selected: value.selected,
  };
}

function parseProduct(value: Record<string, unknown>): ProductData | null {
  const nullableStringFields = [
    "title",
    "description",
    "image",
    "price",
    "discount_price",
    "discount_end_date",
    "currency",
  ] as const;
  if (
    !nullableStringFields.every(
      (field) => value[field] === null || typeof value[field] === "string",
    ) ||
    typeof value.has_discount !== "boolean"
  ) {
    return null;
  }
  return {
    title: value.title as string | null,
    description: value.description as string | null,
    image: value.image as string | null,
    price: value.price as string | null,
    discount_price: value.discount_price as string | null,
    has_discount: value.has_discount,
    discount_end_date: value.discount_end_date as string | null,
    currency: value.currency as string | null,
  };
}

function isValidPrice(value: string | null): boolean {
  if (!value) return false;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0;
}

function isValidImage(value: string | null): boolean {
  if (!value) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "string");
}
