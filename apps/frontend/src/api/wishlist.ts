import { supabaseBrowser } from "@/lib/supabase-browser";
import { Wishlist, WishlistAccent, WishlistVisibility } from "@/types/wishlist";
import { getWishlists } from "@/api/helpers/wishlist-helper";
import {
  CreateWishlistParams,
  UpdateWishlistParams,
  DiscoverSection,
  FriendUpcomingWishlist,
  ReservedItem,
} from "./types/wishilst";

export async function getMyWishlists(
  params: PaginationParams = {},
): Promise<Wishlist[]> {
  const {
    data: { session },
  } = await supabaseBrowser.auth.getSession();

  return getWishlists(
    (query) => query.eq("user_id", session?.user?.id),
    params,
  );
}

export async function getPublicWishlists(
  params: PaginationParams = {},
): Promise<Wishlist[]> {
  const {
    data: { session },
  } = await supabaseBrowser.auth.getSession();

  return getWishlists(
    (query) =>
      query
        .neq("user_id", session?.user?.id)
        .eq("visibility_type", WishlistVisibility.Public),
    params,
  );
}

export async function getFriendsWishlistsDiscover(
  params: PaginationParams = {},
): Promise<DiscoverSection[]> {
  const { skip = 0, take = 10 } = params;

  const { data, error } = await supabaseBrowser.rpc(
    "get_friends_wishlists_discover",
    {
      p_skip: skip,
      p_take: take,
    },
  );

  if (error) {
    console.error("Error fetching friends wishlists:", error);
    throw error;
  }

  return data || [];
}

export async function getFriendsWishlistsReservedByMe(
  params: PaginationParams = {},
): Promise<ReservedItem[]> {
  const { skip = 0, take = 10 } = params;

  const { data, error } = await supabaseBrowser.rpc(
    "get_reserved_items_by_me",
    {
      p_skip: skip,
      p_take: take,
    },
  );

  if (error) {
    console.error("Error fetching reserved wishlists by me:", error);
    throw error;
  }

  return data || [];
}
export async function createWishlist({
  title,
  description,
  visibility = WishlistVisibility.FriendsOnly,
  event_date,
  imageUrl,
  accent = WishlistAccent.Pink,
}: CreateWishlistParams): Promise<Wishlist> {
  const {
    data: { session },
    error: sessionError,
  } = await supabaseBrowser.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.user) throw new Error("Not authenticated");

  const { data, error } = await supabaseBrowser
    .from("wishlist")
    .insert({
      user_id: session.user.id,
      title,
      description,
      visibility_type: visibility,
      image_url: imageUrl,
      event_date: event_date ? event_date.toISOString() : null,
      accent_type: accent,
    })
    .select()
    .single();

  if (error) throw error;

  if (
    visibility === WishlistVisibility.Public ||
    visibility === WishlistVisibility.FriendsOnly
  ) {
    // Викликаємо SQL функцію для створення нотифікацій
    const { error: notifyError } = await supabaseBrowser.rpc(
      "notify_friends_about_new_wishlist",
      { p_wishlist_id: data.id },
    );

    if (notifyError) {
      console.error("Failed to notify friends:", notifyError);
    }
  }

  return data;
}
export async function updateWishlist(
  wishlistId: string,
  updates: UpdateWishlistParams,
): Promise<Wishlist> {
  const dbUpdates: Partial<Wishlist> = {};

  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined)
    dbUpdates.description = updates.description;
  if (updates.visibility !== undefined)
    dbUpdates.visibility_type = updates.visibility;
  if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
  if (updates.accent !== undefined) dbUpdates.accent_type = updates.accent;
  if (updates.event_date !== undefined)
    dbUpdates.event_date = updates.event_date ? updates.event_date.toISOString() : null;

  const { data, error } = await supabaseBrowser
    .from("wishlist")
    .update(dbUpdates)
    .eq("id", wishlistId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function deleteWishlist(wishlistId: string): Promise<void> {
  const { error } = await supabaseBrowser
    .from("wishlist")
    .delete()
    .eq("id", wishlistId);

  if (error) throw error;
}

export async function getWishlistById(wishlistId: string): Promise<Wishlist> {
  const { data, error } = await supabaseBrowser.rpc("get_wishlist_by_id", {
    p_wishlist_id: wishlistId,
  });

  if (error) {
    console.error("Error fetching wishlist:", error);
    throw new Error(error.message || "Failed to fetch wishlist");
  }

  return data as Wishlist;
}

export async function getFriendWishlists(
  friendUserId: string,
  params: PaginationParams = {},
): Promise<Wishlist[]> {
  return getWishlists(
    (query) =>
      query
        .eq("user_id", friendUserId)
        .in("visibility_type", [
          WishlistVisibility.Public,
          WishlistVisibility.FriendsOnly,
        ]),
    params,
  );
}

export async function searchWishlists(
  query: string,
  params: PaginationParams = {},
): Promise<Wishlist[]> {
  const { skip = 0, take = 10 } = params;

  const {
    data: { session },
  } = await supabaseBrowser.auth.getSession();

  if (!session?.user) throw new Error("Not authenticated");

  const { data, error } = await supabaseBrowser
    .from("wishlist")
    .select("*, item(count)")
    .eq("user_id", session.user.id)
    .ilike("title", `%${query}%`)
    .order("created_at", { ascending: false })
    .range(skip, skip + take - 1);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const { item, ...wishlist } = row as {
      item?: { count: number }[];
    } & Wishlist;

    return {
      ...wishlist,
      itemsCount: item?.[0]?.count || 0,
    };
  });
}

export async function getFriendsUpcomingWishlists(): Promise<
  FriendUpcomingWishlist[]
> {
  const {
    data: { session },
    error: sessionError,
  } = await supabaseBrowser.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.user) throw new Error("Not authenticated");

  const { data, error } = await supabaseBrowser.rpc(
    "get_friends_upcoming_wishlists",
    {
      p_user_id: session.user.id,
    },
  );

  if (error) throw error;

  return data || [];
}
