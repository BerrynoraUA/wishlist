import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendUnresolvedAlert } from "@/lib/notify-email";
import type { ProductData, ScrapeResult, ScrapeDiagnostics } from "@/app/admin/scraper-test/constants";
import { getComparableDomain, ensureUrlScheme } from "./classify";

const TABLE = "unresolved_scraper_sites";
const ALERT_THRESHOLD = 100;

interface UnresolvedRow {
  domain: string;
  url: string;
  status: string;
  data: ProductData | null;
  diagnostics: ScrapeDiagnostics | null;
  missing_fields: string[] | null;
  error: string | null;
  duration: number | null;
  comment: string | null;
  request_count: number;
  author: string | null;
  last_author: string | null;
}

function mapRowToScrapeResult(row: UnresolvedRow): ScrapeResult {
  return {
    url: row.url,
    status: row.status as ScrapeResult["status"],
    data: row.data,
    comment: row.comment ?? undefined,
    error: row.error ?? undefined,
    missingFields: row.missing_fields ?? undefined,
    duration: row.duration ?? 0,
    validations: [],
    diagnostics: row.diagnostics ?? undefined,
    requestCount: row.request_count,
    author: row.author ?? undefined,
  };
}

export async function listUnresolved(): Promise<ScrapeResult[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("request_count", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[unresolved-store] listUnresolved failed:", error);
    return [];
  }

  return ((data ?? []) as UnresolvedRow[]).map(mapRowToScrapeResult);
}

interface UpsertInput {
  result: Pick<ScrapeResult, "url" | "status" | "data" | "diagnostics" | "missingFields" | "error" | "duration">;
  author: string | null;
  comment?: string | null;
  increment: boolean;
}

async function upsertUnresolved(
  input: UpsertInput,
): Promise<{ created: boolean; requestCount: number; domain: string } | null> {
  const { result, author, comment = null, increment } = input;
  const domain = getComparableDomain(result.url);
  if (!domain) return null;

  const url = ensureUrlScheme(result.url);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("upsert_unresolved_scraper_site", {
    p_domain: domain,
    p_url: url,
    p_status: result.status,
    p_data: result.data ?? null,
    p_diagnostics: result.diagnostics ?? null,
    p_missing_fields: result.missingFields ?? null,
    p_error: result.error ?? null,
    p_duration: result.duration ?? null,
    p_author: author,
    p_comment: comment,
    p_increment: increment,
  });

  if (error) {
    console.error("[unresolved-store] upsert failed:", error);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return { created: Boolean(row.created), requestCount: Number(row.request_count), domain };
}

/**
 * Auto-record path: increments the request count on repeat, creates the row on
 * first sight, and fires an email alert when the site is new or hits the
 * request threshold (100).
 */
export async function recordUnresolved(input: {
  result: UpsertInput["result"];
  author: string | null;
}): Promise<void> {
  const outcome = await upsertUnresolved({ ...input, increment: true });
  if (!outcome) return;

  if (outcome.created || outcome.requestCount === ALERT_THRESHOLD) {
    await sendUnresolvedAlert({
      domain: outcome.domain,
      url: input.result.url,
      status: input.result.status,
      requestCount: outcome.requestCount,
      author: input.author,
      isNew: outcome.created,
    });
  }
}

/**
 * Admin curation path (Decline / save comment): stores/updates the entry with a
 * comment without incrementing the request count. Still emails if it is the
 * first time the site enters unresolved.
 */
export async function saveUnresolvedComment(input: {
  result: UpsertInput["result"];
  author: string | null;
  comment?: string | null;
}): Promise<ScrapeResult[]> {
  const outcome = await upsertUnresolved({ ...input, increment: false });

  if (outcome?.created) {
    await sendUnresolvedAlert({
      domain: outcome.domain,
      url: input.result.url,
      status: input.result.status,
      requestCount: outcome.requestCount,
      author: input.author,
      isNew: true,
    });
  }

  return listUnresolved();
}

export async function removeUnresolved(url: string): Promise<ScrapeResult[]> {
  const domain = getComparableDomain(url);
  const supabase = getSupabaseAdmin();

  const query = supabase.from(TABLE).delete();
  const { error } = domain
    ? await query.eq("domain", domain)
    : await query.eq("url", url);

  if (error) {
    console.error("[unresolved-store] removeUnresolved failed:", error);
  }

  return listUnresolved();
}
