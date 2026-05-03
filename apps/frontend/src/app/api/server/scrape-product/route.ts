import { NextRequest, NextResponse } from "next/server";
import { scrapeProduct } from "./scraper";

const SCRAPER_ALLOWED_ORIGINS = ["https://wishlane.net"];

function getCorsHeaders(request: NextRequest): Record<string, string> {
  const requestOrigin = request.headers.get("Origin") ?? "";
  if (!SCRAPER_ALLOWED_ORIGINS.includes(requestOrigin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": requestOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
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

  if (!url) {
    return NextResponse.json(
      { error: "Missing 'url' query parameter" },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    const product = await scrapeProduct(url);

    if (!product) {
      return NextResponse.json(
        { error: "Could not extract any product data" },
        { status: 404, headers: corsHeaders },
      );
    }

    return NextResponse.json(product, { headers: corsHeaders });
  } catch {
    return NextResponse.json(
      { error: "Failed to scrape" },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  try {
    const { url } = await request.json();
    const product = await scrapeProduct(url);

    if (!product) {
      return NextResponse.json(
        { error: "Could not extract any product data" },
        { status: 404, headers: corsHeaders },
      );
    }

    return NextResponse.json(product, { headers: corsHeaders });
  } catch {
    return NextResponse.json(
      { error: "Failed to scrape" },
      { status: 500, headers: corsHeaders },
    );
  }
}
