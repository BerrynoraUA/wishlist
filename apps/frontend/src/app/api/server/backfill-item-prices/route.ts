import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env
  .SUPABASE_SERVICE_ROLE_KEY as string;
const CRON_SECRET = process.env.CRON_SECRET as string;

type ItemRow = {
  id: string;
  url: string | null;
  price: string | null;
  discount_price: string | null;
  has_discount: boolean;
};

function parsePriceToNumber(price: string): number | null {
  if (!price) return null;
  const cleaned = price
    .toString()
    .replace(/\s/g, "")
    .replace(/[^0-9,.-]/g, "")
    .replace(/,/g, ".")
    .replace(/(\..*)\./g, "$1");

  const num = Number.parseFloat(cleaned);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}

function formatPrice(num: number, original: string): string {
  const hasDecimals = /[.,]\d/.test(original);
  if (hasDecimals) {
    return num.toFixed(2);
  }
  return String(Math.max(1, Math.round(num)));
}

function dateAtNoonUTC(daysAgo: number): string {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const daysParam = request.nextUrl.searchParams.get("days");
  const days = Math.max(
    1,
    Math.min(30, daysParam ? Number.parseInt(daysParam, 10) : 10)
  );

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: items, error: fetchError } = await supabase
    .from("item")
    .select("id,url,price,discount_price,has_discount")
    .not("url", "is", null)
    .neq("url", "");

  if (fetchError) {
    return NextResponse.json(
      { error: "Failed to fetch items", details: fetchError.message },
      { status: 500 }
    );
  }

  const rows = (items || []) as ItemRow[];

  let processedItems = 0;
  let skippedNoBasePrice = 0;
  let upsertedRows = 0;
  const errors: { id: string; url: string | null; error: string }[] = [];

  const toUpsert: { item_id: string; price: string; price_date: string }[] = [];

  for (const item of rows) {
    const basePriceStr = item.has_discount
      ? item.discount_price || item.price
      : item.price;

    if (!basePriceStr) {
      skippedNoBasePrice++;
      continue;
    }

    const baseNum = parsePriceToNumber(basePriceStr);
    if (!baseNum) {
      skippedNoBasePrice++;
      continue;
    }

    processedItems++;

    for (let day = 0; day < days; day++) {
      const factor = 0.9 + Math.random() * 0.2; // ±10%
      const priceNum = baseNum * factor;
      toUpsert.push({
        item_id: item.id,
        price: formatPrice(priceNum, basePriceStr),
        price_date: dateAtNoonUTC(day),
      });
    }
  }

  // Upsert in chunks to avoid request limits
  const CHUNK_SIZE = 500;
  for (let i = 0; i < toUpsert.length; i += CHUNK_SIZE) {
    const chunk = toUpsert.slice(i, i + CHUNK_SIZE);

    const { error: upsertError } = await supabase
      .from("item_prices_cumulative")
      .upsert(chunk, { onConflict: "item_id,price_date" });

    if (upsertError) {
      errors.push({
        id: "batch",
        url: null,
        error: upsertError.message,
      });
      break;
    }

    upsertedRows += chunk.length;
  }

  return NextResponse.json({
    message: "Backfill complete",
    days,
    total_items_with_url: rows.length,
    processed_items: processedItems,
    skipped_no_base_price: skippedNoBasePrice,
    upserted_rows: upsertedRows,
    errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
  });
}
