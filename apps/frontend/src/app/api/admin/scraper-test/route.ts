import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createServerClient } from "@wishlist/backend/supabase/server";
import { scrapeProductDetailed } from "@/app/api/server/scrape-product/scraper";
import {
  classifyScrape,
  getComparableDomain,
  shouldRecordUnresolved,
} from "@/app/api/server/scrape-product/classify";
import {
  listUnresolved,
  recordUnresolved,
  removeUnresolved,
  saveUnresolvedComment,
} from "@/app/api/server/scrape-product/unresolved-store";
import type { ProductData, ScrapeResult } from "@/app/admin/scraper-test/constants";

export const maxDuration = 300;

const ADMIN_SECRET = process.env.CRON_SECRET as string;
const ACCEPTANCE_CRITERIA_PATH = path.join(
  process.cwd(),
  "src/app/admin/scraper-test/acceptance-criteria.json",
);

interface AcceptanceCriteriaEntry {
  url: string;
  verified_at?: string;
  expected: {
    title: string | null;
    price: string | null;
    discount_price?: string | null;
    currency?: string | null;
    has_discount?: boolean | null;
    image: string | null;
    description: string | null;
  };
}

interface AuthContext {
  authorized: boolean;
  email: string | null;
}

async function getAuthContext(request: NextRequest): Promise<AuthContext> {
  const authHeader = request.headers.get("Authorization");
  if (Boolean(ADMIN_SECRET) && authHeader === `Bearer ${ADMIN_SECRET}`) {
    return { authorized: true, email: null };
  }

  const cookieStore = await cookies();
  const supabase = createServerClient({
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
        try {
          cookieStore.set(name, value, options);
        } catch {
          // ignore when cookies cannot be mutated in this context
        }
      });
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { authorized: Boolean(user), email: user?.email ?? null };
}

export async function GET(request: NextRequest) {
  const { authorized } = await getAuthContext(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ unresolved: await listUnresolved() });
}

export async function POST(request: NextRequest) {
  const { authorized, email } = await getAuthContext(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { urls, autoRecord } = (await request.json()) as {
    urls: string[];
    autoRecord?: boolean;
  };

  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: "Missing or empty 'urls' array" }, { status: 400 });
  }

  const results = [];

  for (const url of urls) {
    const start = Date.now();
    try {
      const scraped = await scrapeProductDetailed(url);
      const duration = Date.now() - start;
      const classified = classifyScrape(scraped);

      const result = {
        url,
        status: classified.status,
        data: classified.data,
        error: classified.error,
        missingFields: classified.missingFields,
        duration,
        diagnostics: scraped.diagnostics,
      };
      results.push(result);

      if (autoRecord && shouldRecordUnresolved(classified.status)) {
        await recordUnresolved({ result, author: email });
      }
    } catch (error) {
      const duration = Date.now() - start;
      const result = {
        url,
        status: "blocked" as const,
        error: error instanceof Error ? error.message : "Unknown error",
        data: null,
        duration,
      };
      results.push(result);

      if (autoRecord) {
        await recordUnresolved({ result, author: email });
      }
    }
  }

  return NextResponse.json({ results });
}

export async function PATCH(request: NextRequest) {
  const { authorized, email } = await getAuthContext(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { result } = (await request.json()) as { result?: ScrapeResult };

  if (!result?.url) {
    return NextResponse.json({ error: "Missing unresolved result" }, { status: 400 });
  }

  const unresolved = await saveUnresolvedComment({
    result,
    author: email,
    comment: result.comment ?? null,
  });

  return NextResponse.json({ unresolved });
}

export async function PUT(request: NextRequest) {
  const { authorized } = await getAuthContext(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url, data } = (await request.json()) as {
    url?: string;
    data?: ProductData | null;
  };

  if (!url || !data) {
    return NextResponse.json({ error: "Missing 'url' or 'data'" }, { status: 400 });
  }

  const domain = getComparableDomain(url);
  if (!domain) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const criteria = await readAcceptanceCriteria();
  const existing = criteria.find((entry) => getComparableDomain(entry.url) === domain);

  if (existing) {
    return NextResponse.json(
      { error: `${domain} is already in acceptance criteria`, existingUrl: existing.url },
      { status: 409 },
    );
  }

  const entry: AcceptanceCriteriaEntry = {
    url,
    verified_at: new Date().toISOString().slice(0, 10),
    expected: {
      title: data.title,
      price: data.price,
      discount_price: data.discount_price,
      currency: data.currency,
      has_discount: data.has_discount,
      image: data.image,
      description: data.description,
    },
  };

  criteria.push(entry);
  await writeFile(ACCEPTANCE_CRITERIA_PATH, `${JSON.stringify(criteria, null, 2)}\n`, "utf8");
  await removeUnresolved(url);

  return NextResponse.json({ entry });
}

export async function DELETE(request: NextRequest) {
  const { authorized } = await getAuthContext(request);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = (await request.json()) as { url?: string };

  if (!url) {
    return NextResponse.json({ error: "Missing 'url'" }, { status: 400 });
  }

  const unresolved = await removeUnresolved(url);
  return NextResponse.json({ unresolved });
}

async function readAcceptanceCriteria(): Promise<AcceptanceCriteriaEntry[]> {
  const raw = await readFile(ACCEPTANCE_CRITERIA_PATH, "utf8");
  const parsed = JSON.parse(raw) as AcceptanceCriteriaEntry[];
  return Array.isArray(parsed) ? parsed : [];
}
