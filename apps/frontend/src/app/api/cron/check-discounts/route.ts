import { NextRequest, NextResponse } from "next/server";
import { scrapeProduct, type ProductData } from "@/app/api/server/scrape-product/route";
import { createSaleAlertNotificationsForFriends } from "@/api/notification";
import { supabaseAdmin } from "@/lib/supabase-admin";

const CRON_SECRET = process.env.CRON_SECRET as string;

type ItemRow = {
  id: string;
  url: string | null;
  name: string | null;
  price: string | null;
  has_discount: boolean;
  discount_price: string | null;
  wishlist_id: string | null;
  wishlist?: { user_id: string | null; title: string | null } | null;
};

type CronStats = {
  total: number;
  updated: number;
  failed: number;
  price_snapshots: {
    inserted: number;
    skipped_no_product: number;
    skipped_no_price: number;
    insert_failed: number;
  };
  sale_alerts: {
    triggered: number;
    inserted: number;
    failed: number;
    skipped_no_owner: number;
  };
  errors?: { id: string; error: string }[];
};

function isCronAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("Authorization");
  return Boolean(CRON_SECRET) && authHeader === `Bearer ${CRON_SECRET}`;
}

function getEffectivePrice(product: ProductData): string | null {
  const effective = product.has_discount
    ? product.discount_price || product.price
    : product.price;
  return effective || null;
}

function isDuplicateKeyError(error: { code?: string; message?: string }) {
  return (
    error.code === "23505" ||
    /duplicate key value|unique constraint/i.test(error.message || "")
  );
}

function shouldNotifySaleAlert(item: ItemRow, product: ProductData): boolean {
  if (!product.has_discount) return false;
  const prevDiscount = item.discount_price ?? null;
  const nextDiscount = (product.discount_price ?? null) as string | null;
  return item.has_discount !== true || prevDiscount !== nextDiscount;
}

async function fetchItemsToCheck(): Promise<ItemRow[]> {
  const { data, error } = await supabaseAdmin
    .from("item")
    .select(
      "id,url,name,price,has_discount,discount_price,wishlist_id,wishlist:wishlist_id(user_id,title)",
    )
    .not("url", "is", null)
    .neq("url", "");

  if (error) throw error;
  return (data ?? []) as ItemRow[];
}

async function updateItemFromProduct(itemId: string, product: ProductData): Promise<void> {
  const updateData: Record<string, unknown> = {
    has_discount: product.has_discount,
    discount_price: product.has_discount ? product.discount_price : null,
    discount_end_date: product.has_discount ? product.discount_end_date : null,
  };

  if (product.price) updateData.price = product.price;

  const { error } = await supabaseAdmin.from("item").update(updateData).eq("id", itemId);
  if (error) throw error;
}

async function insertPriceSnapshot(itemId: string, price: string): Promise<"inserted" | "duplicate" | "failed"> {
  const { error } = await supabaseAdmin
    .from("item_prices_cumulative")
    .insert({ item_id: itemId, price });

  if (!error) return "inserted";
  if (isDuplicateKeyError(error)) return "duplicate";
  return "failed";
}

async function sendSaleAlerts(item: ItemRow, product: ProductData): Promise<{ inserted: number; skippedNoOwner: boolean }>{
  const ownerId = item.wishlist?.user_id ?? null;
  if (!ownerId) return { inserted: 0, skippedNoOwner: true };

  const res = await createSaleAlertNotificationsForFriends({
    supabase: supabaseAdmin,
    ownerId,
    item: {
      id: item.id,
      name: item.name,
      url: item.url,
      price: product.price ?? item.price ?? null,
      discount_price: (product.discount_price ?? null) as string | null,
      wishlist_title: item.wishlist?.title ?? null,
    },
  });

  return { inserted: res.inserted, skippedNoOwner: false };
}

async function processItem(item: ItemRow, stats: CronStats): Promise<void> {
  const product = await scrapeProduct(item.url!);
  if (!product) {
    stats.price_snapshots.skipped_no_product++;
    return;
  }

  await updateItemFromProduct(item.id, product);

  if (shouldNotifySaleAlert(item, product)) {
    stats.sale_alerts.triggered++;
    try {
      const res = await sendSaleAlerts(item, product);
      stats.sale_alerts.inserted += res.inserted;
      if (res.skippedNoOwner) stats.sale_alerts.skipped_no_owner++;
    } catch {
      stats.sale_alerts.failed++;
    }
  }

  const effectivePrice = getEffectivePrice(product);
  if (!effectivePrice) {
    stats.price_snapshots.skipped_no_price++;
  } else {
    const result = await insertPriceSnapshot(item.id, effectivePrice);
    if (result === "inserted") stats.price_snapshots.inserted++;
    if (result === "failed") stats.price_snapshots.insert_failed++;
  }

  stats.updated++;
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let items: ItemRow[] = [];
  try {
    items = await fetchItemsToCheck();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch items";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (items.length === 0) {
    return NextResponse.json({ message: "No items with URLs found", updated: 0 });
  }

  const stats: CronStats = {
    total: items.length,
    updated: 0,
    failed: 0,
    price_snapshots: {
      inserted: 0,
      skipped_no_product: 0,
      skipped_no_price: 0,
      insert_failed: 0,
    },
    sale_alerts: {
      triggered: 0,
      inserted: 0,
      failed: 0,
      skipped_no_owner: 0,
    },
  };

  const BATCH_SIZE = 5;
  const errors: { id: string; error: string }[] = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (item) => processItem(item, stats)),
    );

    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status === "rejected") {
        stats.failed++;
        if (errors.length < 20) {
          errors.push({
            id: batch[j]?.id ?? "unknown",
            error: r.reason instanceof Error ? r.reason.message : "Unknown error",
          });
        }
      }
    }

    if (i + BATCH_SIZE < items.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  if (errors.length > 0) stats.errors = errors;

  return NextResponse.json({ message: "Discount check complete", ...stats });
}
