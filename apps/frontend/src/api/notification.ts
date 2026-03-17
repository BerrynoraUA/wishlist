import type { SupabaseClient } from "@supabase/supabase-js";
import type { Notification } from "@/types";

async function getSupabaseBrowser(): Promise<import("@supabase/supabase-js").SupabaseClient> {
  const mod = await import("@/lib/supabase-browser");
  return mod.supabaseBrowser;
}

type SaleAlertItem = {
  id: string;
  name: string | null;
  url?: string | null;
  price?: string | null;
  discount_price?: string | null;
  wishlist_title?: string | null;
};

export type CreateSaleAlertNotificationsParams = {
  supabase: SupabaseClient;
  ownerId: string;
  item: SaleAlertItem;
};

function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [arr];
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    res.push(arr.slice(i, i + chunkSize));
  }
  return res;
}

function buildSaleAlertText(item: SaleAlertItem): string {
  const name = item.name?.trim() || "An item";
  const wishlistTitle = item.wishlist_title?.trim();
  const wishlistPart = wishlistTitle ? ` in “${wishlistTitle}”` : "";
  const discount = item.discount_price?.trim();
  const base = item.price?.trim();

  if (discount && base)
    return `Sale alert: ${name}${wishlistPart} is now ${discount} (was ${base}).`;
  if (discount) return `Sale alert: ${name}${wishlistPart} is now ${discount}.`;
  return `Sale alert: ${name}${wishlistPart} is now on sale.`;
}

/**
 * Server-side helper for cron/webhooks.
 * Creates notifications for ALL friends of the item owner who:
 *  - have an ACTIVE Pro subscription, and
 *  - have user_settings.notify_sale_alerts = true (missing row treated as true)
 */
export async function createSaleAlertNotificationsForFriends(
  params: CreateSaleAlertNotificationsParams,
): Promise<{
  inserted: number;
  receivers: string[];
  friendCandidates: number;
  proCandidates: number;
  eligibleReceivers: number;
}> {
  const { supabase, ownerId, item } = params;

  // 1) Friends of owner
  const { data: friendRows, error: friendsError } = await supabase
    .from("friends")
    .select("user_f,user_s")
    .or(`user_f.eq.${ownerId},user_s.eq.${ownerId}`);

  if (friendsError) throw friendsError;

  const friendIds = Array.from(
    new Set(
      (friendRows ?? [])
        .map((r: { user_f: string; user_s: string }) =>
          r.user_f === ownerId ? r.user_s : r.user_f,
        )
        .filter(Boolean),
    ),
  );

  if (friendIds.length === 0) {
    return {
      inserted: 0,
      receivers: [],
      friendCandidates: 0,
      proCandidates: 0,
      eligibleReceivers: 0,
    };
  }

  // 2) Only active Pro subscribers
  const { data: subsRows, error: subsError } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .in("user_id", friendIds)
    .eq("plan", "pro")
    .eq("is_active", true);

  if (subsError) throw subsError;

  const proIds = Array.from(
    new Set((subsRows ?? []).map((r: { user_id: string }) => r.user_id).filter(Boolean)),
  );

  if (proIds.length === 0) {
    return {
      inserted: 0,
      receivers: [],
      friendCandidates: friendIds.length,
      proCandidates: 0,
      eligibleReceivers: 0,
    };
  }

  // 3) Respect notification settings (missing row => default true)
  const { data: settingsRows, error: settingsError } = await supabase
    .from("user_settings")
    .select("user_id,notify_sale_alerts")
    .in("user_id", proIds);

  if (settingsError) throw settingsError;

  const settingsByUserId = new Map<string, boolean>();
  for (const row of settingsRows ?? []) {
    const userId = (row as { user_id?: string }).user_id;
    if (!userId) continue;
    const enabled = Boolean((row as { notify_sale_alerts?: boolean }).notify_sale_alerts);
    settingsByUserId.set(userId, enabled);
  }

  const receivers = proIds.filter((userId) => {
    const hasRow = settingsByUserId.has(userId);
    if (!hasRow) return true;
    return settingsByUserId.get(userId) === true;
  });

  if (receivers.length === 0) {
    return {
      inserted: 0,
      receivers: [],
      friendCandidates: friendIds.length,
      proCandidates: proIds.length,
      eligibleReceivers: 0,
    };
  }

  const text = buildSaleAlertText(item);

  // Minimal insert payload: the DB/RPC can join extra fields like sender_name if needed.
  const rows = receivers.map((receiverId) => ({
    sender_id: ownerId,
    receiver_id: receiverId,
    text,
    icon_type: 0,
    is_read: false,
  }));

  // Insert in chunks to avoid payload limits
  let inserted = 0;
  for (const chunk of chunkArray(rows, 500)) {
    const { error } = await supabase.from("notifications").insert(chunk);
    if (error) throw error;
    inserted += chunk.length;
  }

  return {
    inserted,
    receivers,
    friendCandidates: friendIds.length,
    proCandidates: proIds.length,
    eligibleReceivers: receivers.length,
  };
}

export interface GetNotificationsParams {
  limit?: number;
  offset?: number;
  unread_only?: boolean;
}

export async function getUserNotifications(
  params: GetNotificationsParams = {}
): Promise<Notification[]> {
  const supabaseBrowser = await getSupabaseBrowser();
  const {
    data: { session },
    error: sessionError,
  } = await supabaseBrowser.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.user) throw new Error("Not authenticated");

  const { limit = 20, offset = 0, unread_only = false } = params;

  const { data, error } = await supabaseBrowser.rpc(
    "get_user_notifications",
    {
      p_user_id: session.user.id,
      p_limit: limit,
      p_offset: offset,
      p_unread_only: unread_only,
    }
  );

  if (error) throw error;

  return data || [];
}

export async function markNotificationAsRead(
  notificationId: string
): Promise<void> {
  const supabaseBrowser = await getSupabaseBrowser();
  const { error } = await supabaseBrowser
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) throw error;
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const supabaseBrowser = await getSupabaseBrowser();
  const {
    data: { session },
    error: sessionError,
  } = await supabaseBrowser.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.user) throw new Error("Not authenticated");

  const { error } = await supabaseBrowser
    .from("notifications")
    .update({ is_read: true })
    .eq("receiver_id", session.user.id)
    .eq("is_read", false);

  if (error) throw error;
}

export async function deleteAllNotifications(): Promise<void> {
  const supabaseBrowser = await getSupabaseBrowser();
  const {
    data: { session },
    error: sessionError,
  } = await supabaseBrowser.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.user) throw new Error("Not authenticated");

  const { error } = await supabaseBrowser
    .from("notifications")
    .delete()
    .eq("receiver_id", session.user.id);

  if (error) throw error;
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const supabaseBrowser = await getSupabaseBrowser();
  const { error } = await supabaseBrowser
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (error) throw error;
}

export async function getUnreadNotificationsCount(): Promise<number> {
  const supabaseBrowser = await getSupabaseBrowser();
  const {
    data: { session },
    error: sessionError,
  } = await supabaseBrowser.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.user) throw new Error("Not authenticated");

  const { data, error } = await supabaseBrowser.rpc(
    "get_unread_notifications_count",
    {
      p_user_id: session.user.id,
    }
  );

  if (error) throw error;

  return data || 0;
}