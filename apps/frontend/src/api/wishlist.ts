import { supabaseBrowser } from "@/lib/supabase-browser";
import { Wishlist, WishlistAccent, WishlistVisibility } from "@/types/wishlist";
import { getWishlists } from "@/api/helpers/wishlist-helper";
import { getCurrentSession } from "./user";
import { normalizeSearchQuery } from "@/lib/helpers/search";
import {
  CreateWishlistParams,
  UpdateWishlistParams,
  DiscoverSection,
  FriendUpcomingWishlist,
  ReservedItem,
} from "./types/wishilst";
import {
  deletePublicImage,
  uploadPublicImage,
} from "@/lib/helpers/storage-image";

const WISHLIST_IMAGE_BUCKET = "items";

type WishlistFeedRow = Wishlist & {
  items_count?: number;
  owner_nickname?: string | null;
  can_edit?: boolean;
  is_owner?: boolean;
};

export async function getMyWishlists({
  skip = 0,
  take = 10,
  search,
  sort,
  visibilityTypes,
}: PaginationParams = {}): Promise<Wishlist[]> {
  const normalizedSearch = normalizeSearchQuery(search);

  const { data, error } = await supabaseBrowser.rpc("get_my_wishlists_feed", {
    p_skip: skip,
    p_take: take,
    p_search: normalizedSearch || null,
    p_sort: sort || "newest",
    p_visibility_types: visibilityTypes?.length ? visibilityTypes : null,
  });

  if (error) throw error;

  return (data ?? []).map((row: WishlistFeedRow) => ({
    ...row,
    itemsCount: row.items_count,
    ownerNickname: row.owner_nickname,
    canEdit: row.can_edit,
    isOwner: row.is_owner,
  }));
}

export async function getPublicWishlists(
  params: PaginationParams = {},
): Promise<Wishlist[]> {
  const session = await getCurrentSession();

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
  const {
    skip = 0,
    take = 10,
    search,
    sort,
    priorities,
    priceMin,
    priceMax,
    displayCurrency,
  } = params;
  const normalizedSearch = normalizeSearchQuery(search);

  const { data, error } = await supabaseBrowser.rpc(
    "get_friends_wishlists_discover",
    {
      p_skip: skip,
      p_take: take,
      p_search: normalizedSearch || null,
      p_sort: sort || "default",
      p_priorities: priorities?.length ? priorities : null,
      p_price_min: priceMin ?? null,
      p_price_max: priceMax ?? null,
      p_display_currency: displayCurrency || "USD",
    },
  );

  if (error) {
    console.error("Error fetching friends wishlists:", error);
    throw error;
  }

  return data || [];
}

export async function getFriendsWishlistsDiscoverAll(
  params: PaginationParams = {},
): Promise<DiscoverSection[]> {
  const {
    skip = 0,
    take = 10,
    search,
    sort,
    priorities,
    priceMin,
    priceMax,
    displayCurrency,
  } = params;
  const normalizedSearch = normalizeSearchQuery(search);

  const { data, error } = await supabaseBrowser.rpc(
    "get_friends_wishlists_discover_all",
    {
      p_skip: skip,
      p_take: take,
      p_search: normalizedSearch || null,
      p_sort: sort || "default",
      p_priorities: priorities?.length ? priorities : null,
      p_price_min: priceMin ?? null,
      p_price_max: priceMax ?? null,
      p_display_currency: displayCurrency || "USD",
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
  const {
    skip = 0,
    take = 10,
    search,
    sort,
    priorities,
    priceMin,
    priceMax,
    displayCurrency,
  } = params;
  const normalizedSearch = normalizeSearchQuery(search);

  const { data, error } = await supabaseBrowser.rpc(
    "get_reserved_items_by_me",
    {
      p_skip: skip,
      p_take: take,
      p_search: normalizedSearch || null,
      p_sort: sort || "default",
      p_priorities: priorities?.length ? priorities : null,
      p_price_min: priceMin ?? null,
      p_price_max: priceMax ?? null,
      p_display_currency: displayCurrency || "USD",
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
  image,
  imageUrl,
  accent = WishlistAccent.Pink,
}: CreateWishlistParams): Promise<Wishlist> {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error("Not authenticated");

  let finalImageUrl: string | null = null;
  let uploadedFile = false;

  if (image) {
    finalImageUrl = await uploadWishlistImage(image);
    uploadedFile = true;
  } else if (imageUrl) {
    finalImageUrl = imageUrl;
  }

  const { data, error } = await supabaseBrowser
    .from("wishlist")
    .insert({
      user_id: session.user.id,
      title,
      description,
      visibility_type: visibility,
      image_url: finalImageUrl,
      event_date: event_date ? event_date.toISOString() : null,
      accent_type: accent,
    })
    .select()
    .single();

  if (error) {
    if (uploadedFile && finalImageUrl) {
      await deleteWishlistImage(finalImageUrl).catch(console.error);
    }

    throw error;
  }

  if (
    visibility === WishlistVisibility.Public ||
    visibility === WishlistVisibility.FriendsOnly
  ) {
    // Викликаємо SQL функцію для створення нотифікацій
    const { error: notifyError } = await supabaseBrowser.rpc(
      "notify_friends_about_new_wishlist",
      {
        p_wishlist_id: data.id,
      },
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
  const { image, removeImage, imageUrl, ...restUpdates } = updates;
  const dbUpdates: Partial<Wishlist> = {};

  if (restUpdates.title !== undefined) dbUpdates.title = restUpdates.title;
  if (restUpdates.description !== undefined)
    dbUpdates.description = restUpdates.description;
  if (restUpdates.visibility !== undefined)
    dbUpdates.visibility_type = restUpdates.visibility;
  if (restUpdates.accent !== undefined)
    dbUpdates.accent_type = restUpdates.accent;
  if (restUpdates.event_date !== undefined)
    dbUpdates.event_date = restUpdates.event_date
      ? restUpdates.event_date.toISOString()
      : null;

  if (image || removeImage || imageUrl !== undefined) {
    const { data: currentWishlist } = await supabaseBrowser
      .from("wishlist")
      .select("image_url")
      .eq("id", wishlistId)
      .single();

    let finalImageUrl: string | null | undefined = undefined;
    let shouldDeleteOldImage = false;

    if (removeImage) {
      finalImageUrl = null;
      shouldDeleteOldImage = true;
    } else if (image) {
      finalImageUrl = await uploadWishlistImage(image);
      shouldDeleteOldImage = true;
    } else if (imageUrl !== undefined) {
      finalImageUrl = imageUrl;
      if (imageUrl !== currentWishlist?.image_url) {
        shouldDeleteOldImage = true;
      }
    }

    if (shouldDeleteOldImage && currentWishlist?.image_url) {
      await deleteWishlistImage(currentWishlist.image_url).catch(console.error);
    }

    if (finalImageUrl !== undefined) {
      dbUpdates.image_url = finalImageUrl;
    }
  }

  const { data, error } = await supabaseBrowser
    .from("wishlist")
    .update(dbUpdates)
    .eq("id", wishlistId)
    .select()
    .single();

  if (error) {
    if (
      image &&
      dbUpdates.image_url &&
      typeof dbUpdates.image_url === "string"
    ) {
      await deleteWishlistImage(dbUpdates.image_url).catch(console.error);
    }

    throw error;
  }

  return data;
}

export async function uploadWishlistImage(file: File): Promise<string> {
  return uploadPublicImage({
    file,
    bucket: WISHLIST_IMAGE_BUCKET,
    maxBytes: 5 * 1024 * 1024,
    oversizeMessage: "Image size must be less than 5MB",
    uploadErrorMessage: "Failed to upload image",
    logLabel: "wishlist image",
    buildPath: ({ userId, extension, timestamp, randomString }) =>
      `${userId}/wishlist-${timestamp}-${randomString}.${extension}`,
  });
}

export async function deleteWishlistImage(imageUrl: string): Promise<void> {
  await deletePublicImage({
    imageUrl,
    bucket: WISHLIST_IMAGE_BUCKET,
    logLabel: "wishlist image",
  });
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

  const session = await getCurrentSession();

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

    const itemsCount = item?.[0]?.count || 0;

    return {
      ...wishlist,
      items_count: itemsCount,
      itemsCount,
      can_edit: true,
      is_owner: true,
      access_type: null,
      owner_nickname: wishlist.owner_nickname ?? null,
    };
  });
}

export async function getFriendsUpcomingWishlists(): Promise<
  FriendUpcomingWishlist[]
> {
  const session = await getCurrentSession();
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

export async function grantWishlistAccess(
  wishlistId: string,
  grantedToUserId: string,
  accessType: 0 | 1,
) {
  const { data, error } = await supabaseBrowser.rpc("grant_wishlist_access", {
    p_wishlist_id: wishlistId,
    p_granted_to_user_id: grantedToUserId,
    p_access_type: accessType,
  });

  if (error) throw error;
  return data;
}

export async function revokeWishlistAccess(
  wishlistId: string,
  targetUserId: string,
) {
  if (!targetUserId) {
    throw new Error("Missing target user id for revoke access");
  }

  const { data, error } = await supabaseBrowser.rpc("revoke_wishlist_access", {
    p_wishlist_id: wishlistId,
    p_target_user_id: targetUserId,
  });

  if (error) throw error;
  return data;
}

export async function getFriendsWishlistsPurchasedByMe(
  params: PaginationParams = {},
): Promise<ReservedItem[]> {
  const {
    skip = 0,
    take = 10,
    search,
    sort,
    priorities,
    priceMin,
    priceMax,
    displayCurrency,
  } = params;
  const normalizedSearch = normalizeSearchQuery(search);

  const { data, error } = await supabaseBrowser.rpc("get_my_bought_items", {
    p_skip: skip,
    p_take: take,
    p_search: normalizedSearch || null,
    p_sort: sort || "default",
    p_priorities: priorities?.length ? priorities : null,
    p_price_min: priceMin ?? null,
    p_price_max: priceMax ?? null,
    p_display_currency: displayCurrency || "USD",
  });

  if (error) {
    console.error("Error fetching my bought items:", error);
    throw error;
  }

  return data || [];
}
