import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
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
import { getAdminEmailAccess } from "@/lib/admin-email-access";

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
  authenticated: boolean;
  email: string | null;
}

async function getAuthContext(request: NextRequest): Promise<AuthContext> {
  const authHeader = request.headers.get("Authorization");
  if (Boolean(ADMIN_SECRET) && authHeader === `Bearer ${ADMIN_SECRET}`) {
    return { authorized: true, authenticated: true, email: null };
  }

  return getAdminEmailAccess();
}

function unauthorizedResponse(context: AuthContext) {
  return NextResponse.json(
    { error: context.authenticated ? "Forbidden" : "Unauthorized" },
    { status: context.authenticated ? 403 : 401 },
  );
}

export async function GET(request: NextRequest) {
  const authContext = await getAuthContext(request);
  if (!authContext.authorized) {
    return unauthorizedResponse(authContext);
  }

  return NextResponse.json({ unresolved: await listUnresolved() });
}

export async function POST(request: NextRequest) {
  const authContext = await getAuthContext(request);
  if (!authContext.authorized) {
    return unauthorizedResponse(authContext);
  }
  const { email } = authContext;

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
  const authContext = await getAuthContext(request);
  if (!authContext.authorized) {
    return unauthorizedResponse(authContext);
  }
  const { email } = authContext;

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
  const authContext = await getAuthContext(request);
  if (!authContext.authorized) {
    return unauthorizedResponse(authContext);
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
  const authContext = await getAuthContext(request);
  if (!authContext.authorized) {
    return unauthorizedResponse(authContext);
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
