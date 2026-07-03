export type ScraperStatus = "success" | "partial" | "failed" | "blocked";
export type TestState = "idle" | "running" | "done";
export type SortField = "site" | "status" | "duration";
export type SortDir = "asc" | "desc";
export type StatusFilter = "all" | ScraperStatus;

export interface ProductData {
  title: string | null;
  description: string | null;
  image: string | null;
  price: string | null;
  discount_price: string | null;
  has_discount: boolean;
  discount_end_date: string | null;
  currency: string | null;
}

export interface FieldValidation {
  field: string;
  expected: string | boolean | null;
  actual: string | boolean | null;
  /** null = not validated (expected is null) */
  match: boolean | null;
}

export interface ScrapeDiagnostics {
  engine: "legacy" | "scrapling";
  fetchMethod: string;
  selectedFetchMethod?: string;
  attempts: FetchAttempt[];
  parserSources: Record<string, { source: string; library: string }>;
  warnings?: string[];
}

export interface FetchAttempt {
  sequence: number;
  mode: string;
  purpose: string;
  outcome: "received" | "blocked" | "error" | "timeout" | "skipped";
  durationMs: number;
  status?: number;
  blockReason?: string;
  error?: string;
  parseScore?: number;
  parseAccepted?: boolean;
  selected?: boolean;
}

export interface ScrapeResult {
  url: string;
  status: ScraperStatus;
  data: ProductData | null;
  error?: string;
  missingFields?: string[];
  duration: number;
  validations: FieldValidation[];
  diagnostics?: ScrapeDiagnostics;
}

/** Shape of each entry in POST /api/admin/scraper-test `results`. */
export interface ApiScrapeResultRow {
  url: string;
  status: ScraperStatus;
  data: ProductData | null;
  error?: string;
  missingFields?: string[];
  duration: number;
  diagnostics?: ScrapeDiagnostics;
}

/**
 * Sort order used when the user sorts by status column.
 */
export const STATUS_ORDER: Record<string, number> = {
  success: 0,
  partial: 1,
  failed: 2,
  blocked: 3,
};
