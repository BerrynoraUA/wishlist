import { supabase } from "@/lib/supabase";
import { normalizeSearchQuery, parseEventDate } from "@/lib/wishlists";
import type {
  UserStatistics,
  Wishlist,
  WishlistFormValues,
  WishlistQueryParams,
  WishlistUpdateValues,
} from "@/types/wishlist";

type WishlistFeedRow = Wishlist & {
  items_count?: number | null;
  owner_nickname?: string | null;
  can_edit?: boolean | null;
  is_owner?: boolean | null;
};

function normalizeWishlist(row: WishlistFeedRow): Wishlist {
  return {
    ...row,
    items_count: row.items_count ?? 0,
    owner_nickname: row.owner_nickname ?? null,
    can_edit: row.can_edit ?? false,
    is_owner: row.is_owner ?? false,
    access_type: row.access_type ?? null,
  };
}

export async function getMyWishlists({
  skip = 0,
  take = 10,
  search,
  sort,
  visibilityTypes,
}: WishlistQueryParams = {}): Promise<Wishlist[]> {
  const normalizedSearch = normalizeSearchQuery(search);
  const { data, error } = await supabase.rpc("get_my_wishlists_feed", {
    p_skip: skip,
    p_take: take,
    p_search: normalizedSearch || null,
    p_sort: sort || "newest",
    p_visibility_types: visibilityTypes?.length ? visibilityTypes : null,
  });

  if (error) throw error;

  return ((data ?? []) as WishlistFeedRow[]).map(normalizeWishlist);
}

export async function getMyStatistics(): Promise<UserStatistics> {
  const { data, error } = await supabase.rpc("get_user_stats");

  if (error) throw error;

  return (
    (Array.isArray(data) ? data[0] : data) ?? {
      wishlists_count: 0,
      total_items_count: 0,
      reserved_items_count: 0,
      purchased_items_count: 0,
    }
  );
}

export async function createWishlist(values: WishlistFormValues): Promise<Wishlist> {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!userData.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("wishlist")
    .insert({
      user_id: userData.user.id,
      title: values.title.trim(),
      description: values.description.trim() || null,
      visibility_type: values.visibility,
      accent_type: values.accent,
      event_date: parseEventDate(values.eventDate),
      image_url: values.imageUrl.trim() || null,
    })
    .select()
    .single();

  if (error) throw error;

  if (values.visibility !== 2) {
    await supabase.rpc("notify_friends_about_new_wishlist", {
      p_wishlist_id: data.id,
    });
  }

  return normalizeWishlist(data as WishlistFeedRow);
}

export async function updateWishlist(
  wishlistId: string,
  values: WishlistFormValues,
): Promise<Wishlist> {
  const { data, error } = await supabase
    .from("wishlist")
    .update({
      title: values.title.trim(),
      description: values.description.trim() || null,
      visibility_type: values.visibility,
      accent_type: values.accent,
      event_date: parseEventDate(values.eventDate),
      image_url: values.imageUrl.trim() || null,
    })
    .eq("id", wishlistId)
    .select()
    .single();

  if (error) throw error;

  return normalizeWishlist(data as WishlistFeedRow);
}

export async function patchWishlist(
  wishlistId: string,
  values: WishlistUpdateValues,
): Promise<Wishlist> {
  const updates: Record<string, unknown> = {};

  if (values.title !== undefined) updates.title = values.title.trim();
  if (values.description !== undefined) {
    updates.description = values.description?.trim() || null;
  }
  if (values.visibility !== undefined) updates.visibility_type = values.visibility;
  if (values.accent !== undefined) updates.accent_type = values.accent;
  if (values.eventDate !== undefined) {
    updates.event_date = values.eventDate ? parseEventDate(values.eventDate) : null;
  }
  if (values.imageUrl !== undefined) {
    updates.image_url = values.imageUrl?.trim() || null;
  }

  const { data, error } = await supabase
    .from("wishlist")
    .update(updates)
    .eq("id", wishlistId)
    .select()
    .single();

  if (error) throw error;

  return normalizeWishlist(data as WishlistFeedRow);
}

export async function deleteWishlist(wishlistId: string): Promise<void> {
  const { error } = await supabase.from("wishlist").delete().eq("id", wishlistId);

  if (error) throw error;
}

export async function getWishlistById(wishlistId: string): Promise<Wishlist> {
  const { data, error } = await supabase.rpc("get_wishlist_by_id", {
    p_wishlist_id: wishlistId,
  });

  if (error) throw error;

  return normalizeWishlist(data as WishlistFeedRow);
}

export async function grantWishlistAccess(
  wishlistId: string,
  grantedToUserId: string,
  accessType: 0 | 1 | 2 | 3,
) {
  const { data, error } = await supabase.rpc("grant_wishlist_access", {
    p_wishlist_id: wishlistId,
    p_granted_to_user_id: grantedToUserId,
    p_access_type: accessType,
  });

  if (error) throw error;
  return data;
}

export async function revokeWishlistAccess(wishlistId: string, targetUserId: string) {
  if (!targetUserId) {
    throw new Error("Missing target user id for revoke access");
  }

  const { data, error } = await supabase.rpc("revoke_wishlist_access", {
    p_wishlist_id: wishlistId,
    p_target_user_id: targetUserId,
  });

  if (error) throw error;
  return data;
}
