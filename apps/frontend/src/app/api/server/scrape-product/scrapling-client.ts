import "server-only";

import type { ProductData } from "./helpers/types";

export type ScraplingMode = "disabled" | "shadow" | "fallback";

type ScraplingQuality = {
  score: number;
  accepted: boolean;
  warnings: string[];
};

type ScraplingDiagnostics = {
  fetch_mode: string;
  status: number | null;
  attempts: number;
  elapsed_ms: number;
  parser_sources: Record<string, string>;
};

export type ScraplingResponse = {
  product: ProductData;
  quality: ScraplingQuality;
  diagnostics: ScraplingDiagnostics;
};

const DEFAULT_SERVICE_URL = "http://127.0.0.1:8001";
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_SHADOW_SAMPLE_RATE = 0.1;

export function getScraplingMode(): ScraplingMode {
  const value = process.env.SCRAPLING_SERVICE_MODE?.trim().toLowerCase();
  return value === "shadow" || value === "fallback" ? value : "disabled";
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
      return null;
    }

    const payload: unknown = await response.json();
    return parseScraplingResponse(payload);
  } catch (error) {
    console.warn("[scrapling] service unavailable", {
      reason: error instanceof Error ? error.name : "unknown",
    });
    return null;
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
  if (!product?.title?.trim()) return false;
  return (
    scoreProduct(product) >= 70 &&
    Boolean(isValidPrice(product.price) || isValidImage(product.image))
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
  const diagnostics = value.diagnostics;
  if (
    typeof score !== "number" ||
    !Number.isFinite(score) ||
    typeof accepted !== "boolean" ||
    !Array.isArray(warnings) ||
    !warnings.every((warning) => typeof warning === "string") ||
    typeof diagnostics.fetch_mode !== "string" ||
    !(diagnostics.status === null || typeof diagnostics.status === "number") ||
    typeof diagnostics.attempts !== "number" ||
    typeof diagnostics.elapsed_ms !== "number" ||
    !isStringRecord(diagnostics.parser_sources)
  ) {
    return null;
  }

  return {
    product,
    quality: { score, accepted, warnings },
    diagnostics: {
      fetch_mode: diagnostics.fetch_mode,
      status: diagnostics.status,
      attempts: diagnostics.attempts,
      elapsed_ms: diagnostics.elapsed_ms,
      parser_sources: diagnostics.parser_sources,
    },
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
