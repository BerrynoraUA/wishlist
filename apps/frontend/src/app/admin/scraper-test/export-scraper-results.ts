import * as XLSX from "xlsx";

export type ExportRowInput = {
  url: string;
  status: string;
  duration: number;
  error?: string;
  missingFields?: string[];
  data: {
    title: string | null;
    description: string | null;
    image: string | null;
    price: string | null;
    discount_price: string | null;
    has_discount: boolean;
    discount_end_date: string | null;
    currency: string | null;
  } | null;
  validations: {
    field: string;
    expected: string | boolean | null;
    actual: string | boolean | null;
    match: boolean | null;
  }[];
  diagnostics?: {
    engine: "legacy" | "scrapling" | "official_api" | "internal_api";
    fetchMethod: string;
    selectedFetchMethod?: string;
    attempts: {
      sequence: number;
      mode: string;
      purpose: string;
      outcome: string;
      durationMs: number;
      status?: number;
      blockReason?: string;
      error?: string;
      parseScore?: number;
      parseAccepted?: boolean;
      selected?: boolean;
    }[];
    parserSources: Record<string, { source: string; library: string }>;
    warnings?: string[];
    api?: {
      provider: string;
      apiKind: "official" | "internal";
      adapter: string;
      itemId?: string;
    };
  };
};

type ExportRow = {
  url: string;
  status: string;
  duration_ms: number;
  error: string;
  missing_fields: string;
  title: string;
  description: string;
  image: string;
  price: string;
  currency: string;
  discount_price: string;
  has_discount: string;
  discount_end_date: string;
  validations: string;
  engine: string;
  fetch_method: string;
  selected_fetch_method: string;
  pipeline: string;
  parser_sources: string;
  warnings: string;
  api_provider: string;
  api_kind: string;
  api_adapter: string;
  api_item_id: string;
};

function toRows(results: ExportRowInput[]): ExportRow[] {
  return results.map((r) => ({
    url: r.url,
    status: r.status,
    duration_ms: r.duration,
    error: r.error ?? "",
    missing_fields: r.missingFields?.join(", ") ?? "",
    title: r.data?.title ?? "",
    description: r.data?.description ?? "",
    image: r.data?.image ?? "",
    price: r.data?.price ?? "",
    currency: r.data?.currency ?? "",
    discount_price: r.data?.discount_price ?? "",
    has_discount: r.data?.has_discount === undefined ? "" : r.data.has_discount ? "yes" : "no",
    discount_end_date: r.data?.discount_end_date ?? "",
    validations: formatValidations(r.validations),
    engine: r.diagnostics?.engine ?? "",
    fetch_method: r.diagnostics?.fetchMethod ?? "",
    selected_fetch_method: r.diagnostics?.selectedFetchMethod ?? "",
    pipeline:
      r.diagnostics?.attempts
        .map(
          (attempt) =>
            `${attempt.sequence}. ${attempt.mode}: ${attempt.outcome} (${attempt.durationMs}ms)`,
        )
        .join(" → ") ?? "",
    parser_sources: r.diagnostics
      ? Object.entries(r.diagnostics.parserSources)
          .map(([field, details]) => `${field}: ${details.source} (${details.library})`)
          .join(" | ")
      : "",
    warnings: r.diagnostics?.warnings?.join(", ") ?? "",
    api_provider: r.diagnostics?.api?.provider ?? "",
    api_kind: r.diagnostics?.api?.apiKind ?? "",
    api_adapter: r.diagnostics?.api?.adapter ?? "",
    api_item_id: r.diagnostics?.api?.itemId ?? "",
  }));
}

function formatValidations(
  validations: {
    field: string;
    expected: string | boolean | null;
    actual: string | boolean | null;
    match: boolean | null;
  }[],
): string {
  return validations
    .map((v) => {
      if (v.match === null) {
        return `${v.field}: (no expected value)`;
      }
      return `${v.field}: ${v.match ? "match" : "mismatch"} (expected ${JSON.stringify(v.expected)}, got ${JSON.stringify(v.actual)})`;
    })
    .join(" | ");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportScraperResultsJson(
  results: ExportRowInput[],
  filenameBase = "scraper-test-results",
) {
  const payload = {
    exportedAt: new Date().toISOString(),
    count: results.length,
    results: results.map((r) => ({
      url: r.url,
      status: r.status,
      durationMs: r.duration,
      error: r.error,
      missingFields: r.missingFields,
      data: r.data,
      validations: r.validations,
      diagnostics: r.diagnostics,
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  triggerDownload(blob, `${filenameBase}.json`);
}

export function exportScraperResultsExcel(
  results: ExportRowInput[],
  filenameBase = "scraper-test-results",
) {
  const rows = toRows(results);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Results");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, `${filenameBase}.xlsx`);
}
