import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@wishlist/backend/supabase/server";
import { createClientWithKey } from "@wishlist/backend/supabase/admin";
import { getSupabasePublicEnv } from "@wishlist/backend/supabase/shared";
import { scrapeProductDetailed } from "./scraper";
import { classifyScrape, shouldRecordUnresolved } from "./classify";
import { recordUnresolved } from "./unresolved-store";

export const maxDuration = 300;

const SCRAPER_ALLOWED_ORIGINS = ["https://wishlane.net"];
const AUTO_RECORD_SOURCE = "add-item";

function getCorsHeaders(request: NextRequest): Record<string, string> {
  const requestOrigin = request.headers.get("Origin") ?? "";
  if (!SCRAPER_ALLOWED_ORIGINS.includes(requestOrigin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": requestOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

/**
 * Best-effort author resolution for the add-item flow. Tries a bearer token
 * (mobile) then the Supabase session cookie (web). Never throws — an anonymous
 * scrape still succeeds, it just records no author.
 */
async function resolveAuthor(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice("Bearer ".length);
      const { key } = getSupabasePublicEnv();
      const supabase = createClientWithKey(key);
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      if (user?.email) return user.email;
    }

    const cookieStore = await cookies();
    const supabase = createServerClient({
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // no-op: this route never mutates auth cookies
      },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.email ?? null;
  } catch {
    return null;
  }
}

async function handleScrape(request: NextRequest, url: string, source: string | null) {
  const corsHeaders = getCorsHeaders(request);
  const scraped = await scrapeProductDetailed(url);
  const classified = classifyScrape(scraped);

  if (source === AUTO_RECORD_SOURCE && shouldRecordUnresolved(classified.status)) {
    const author = await resolveAuthor(request);
    await recordUnresolved({
      result: {
        url,
        status: classified.status,
        data: classified.data,
        diagnostics: scraped.diagnostics,
        missingFields: classified.missingFields,
        error: classified.error,
        duration: 0,
      },
      author,
    });
  }

  // Blocked/failed scrapes (including placeholder-only pages that carry just a
  // junk title like the bare domain) are not usable product data — surface them
  // as an error instead of autofilling junk. `partial` still returns 200.
  if (
    !scraped.product ||
    classified.status === "blocked" ||
    classified.status === "failed"
  ) {
    return NextResponse.json(
      { error: classified.error ?? "Could not extract any product data" },
      { status: 404, headers: corsHeaders },
    );
  }

  return NextResponse.json(scraped.product, { headers: corsHeaders });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  const url = request.nextUrl.searchParams.get("url");
  const source = request.nextUrl.searchParams.get("source");

  if (!url) {
    return NextResponse.json(
      { error: "Missing 'url' query parameter" },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    return await handleScrape(request, url, source);
  } catch {
    return NextResponse.json({ error: "Failed to scrape" }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  try {
    const { url, source } = (await request.json()) as { url: string; source?: string };
    return await handleScrape(request, url, source ?? null);
  } catch {
    return NextResponse.json({ error: "Failed to scrape" }, { status: 500, headers: corsHeaders });
  }
}
