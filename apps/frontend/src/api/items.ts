import { supabaseBrowser } from "@/lib/supabase-browser";
import { Item } from "@/types/item";
import type { ItemQueryParams } from "@wishlist/backend/types";
import { CreateItemParams, UpdateItemParams } from "./types/item";
import { getCurrentSession } from "./user";
import { deletePublicImage, uploadPublicImage } from "@/lib/helpers/storage-image";
import { isStarPriorityId, STAR_PRIORITY_ID } from "@/lib/priorities";
import { createLocalizedNotification } from "@/lib/create-notification";

/** Extra fields the toggle RPCs return alongside the item, used to notify the owner. */
type ToggleItemResult = {
  owner_id?: string | null;
  wishlist_id?: string | null;
  is_reserved_by_me?: boolean;
  is_bought_by_me?: boolean;
};

const ITEM_IMAGE_BUCKET = "items";
const MAX_STAR_ITEMS_PER_WISHLIST = 3;

async function ensureProForPriority(priority_id: string | null | undefined) {
  void priority_id;
}

async function ensureStarPriorityLimit(wishlistId: string, excludeItemId?: string) {
  let query = supabaseBrowser
    .from("item")
    .select("id", { count: "exact", head: true })
    .eq("wishlist_id", wishlistId)
    .eq("priority_id", STAR_PRIORITY_ID);

  if (excludeItemId) {
    query = query.neq("id", excludeItemId);
  }

  const { count, error } = await query;
  if (error) throw error;

  if ((count ?? 0) >= MAX_STAR_ITEMS_PER_WISHLIST) {
    throw new Error("You can have up to 3 starred items in one wishlist.");
  }
}

export async function createItem({
  wishlist_id,
  name,
  description,
  price,
  priority_id,
  image,
  image_url,
  url,
  status = 0,
  discount_price,
  has_discount,
  discount_end_date,
  currency,
  additional_links,
}: CreateItemParams): Promise<Item> {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error("Not authenticated");

  await ensureProForPriority(priority_id);

  if (isStarPriorityId(priority_id)) {
    await ensureStarPriorityLimit(wishlist_id);
  }

  let finalImageUrl: string | null = null;
  let uploadedFile = false;

  if (image) {
    finalImageUrl = await uploadItemImage(image);
    uploadedFile = true;
  } else if (image_url) {
    finalImageUrl = image_url;
  }

  const { data, error } = await supabaseBrowser
    .from("item")
    .insert({
      wishlist_id,
      name,
      description,
      price,
      priority_id: priority_id ?? null,
      image_url: finalImageUrl,
      url,
      status,
      discount_price: discount_price ?? null,
      has_discount: has_discount ?? false,
      discount_end_date: discount_end_date ?? null,
      currency: currency ?? null,
      additional_links: additional_links ?? [],
    })
    .select()
    .single();

  if (error) {
    if (uploadedFile && finalImageUrl) {
      await deleteItemImage(finalImageUrl).catch(console.error);
    }
    throw error;
  }

  return data;
}

export async function getWishlistItems(
  wishlistId: string,
  params: ItemQueryParams = {},
): Promise<Item[]> {
  const {
    skip = 0,
    take = 50,
    search,
    sort = "newest",
    statuses,
    priorities,
    priceMin,
    priceMax,
  } = params;

  const { data, error } = await supabaseBrowser.rpc("get_wishlist_items", {
    p_wishlist_id: wishlistId,
    p_skip: skip,
    p_take: take,
    p_search: search || null,
    p_sort: sort,
    p_statuses: statuses?.length ? statuses : null,
    p_priorities: priorities?.length ? priorities : null,
    p_price_min: priceMin ?? null,
    p_price_max: priceMax ?? null,
  });

  if (error) throw error;

  return (data as Item[]) || [];
}

/**
 * Records a report against someone else's item. Resolves to false when this
 * user had already reported it — the same person never counts twice.
 */
export async function reportItem(itemId: string): Promise<boolean> {
  const { data, error } = await supabaseBrowser.rpc("report_item", { p_item_id: itemId });

  if (error) throw error;

  return Boolean(data);
}

export async function updateItem(itemId: string, updates: UpdateItemParams): Promise<Item> {
  const { image, removeImage, image_url, ...restUpdates } = updates;

  await ensureProForPriority(restUpdates.priority_id);

  if (isStarPriorityId(restUpdates.priority_id)) {
    const { data: currentItem, error: currentItemError } = await supabaseBrowser
      .from("item")
      .select("wishlist_id,priority_id")
      .eq("id", itemId)
      .single();

    if (currentItemError) throw currentItemError;

    // Already starred items keep their slot — only newly starred ones count.
    if (!isStarPriorityId(currentItem.priority_id)) {
      await ensureStarPriorityLimit(currentItem.wishlist_id, itemId);
    }
  }

  if (image || removeImage || image_url !== undefined) {
    const { data: currentItem } = await supabaseBrowser
      .from("item")
      .select("image_url")
      .eq("id", itemId)
      .single();

    let finalImageUrl: string | null | undefined = undefined;
    let shouldDeleteOldImage = false;

    if (removeImage) {
      finalImageUrl = null;
      shouldDeleteOldImage = true;
    } else if (image) {
      finalImageUrl = await uploadItemImage(image);
      shouldDeleteOldImage = true;
    } else if (image_url !== undefined) {
      finalImageUrl = image_url;
      if (image_url !== currentItem?.image_url) {
        shouldDeleteOldImage = true;
      }
    }

    if (shouldDeleteOldImage && currentItem?.image_url) {
      await deleteItemImage(currentItem.image_url).catch(console.error);
    }

    const updatePayload: any = { ...restUpdates };
    if (finalImageUrl !== undefined) {
      updatePayload.image_url = finalImageUrl;
    }

    const { data, error } = await supabaseBrowser
      .from("item")
      .update(updatePayload)
      .eq("id", itemId)
      .select()
      .single();

    if (error) {
      if (image && finalImageUrl && typeof finalImageUrl === "string") {
        await deleteItemImage(finalImageUrl).catch(console.error);
      }
      throw error;
    }

    return data;
  } else {
    const { data, error } = await supabaseBrowser
      .from("item")
      .update(restUpdates)
      .eq("id", itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export async function deleteItem(itemId: string): Promise<void> {
  const { error } = await supabaseBrowser.from("item").delete().eq("id", itemId);

  if (error) throw error;
}

export async function toggleItemReservation(itemId: string): Promise<Item> {
  const { data, error } = await supabaseBrowser.rpc("toggle_item_reservation", {
    p_item_id: itemId,
  });

  if (error) {
    console.error("Error toggling item reservation:", error);
    throw new Error(error.message || "Failed to toggle reservation");
  }

  const result = data as ToggleItemResult;
  if (result?.is_reserved_by_me && result.owner_id) {
    void createLocalizedNotification({
      receiverId: result.owner_id,
      key: "item_reserved",
      vars: {},
      entityId: result.wishlist_id ?? null,
    });
  }

  return data as Item;
}

export async function toggleItemBought(itemId: string): Promise<Item> {
  const { data, error } = await supabaseBrowser.rpc("toggle_item_bought", {
    p_item_id: itemId,
  });

  if (error) {
    console.error("Error toggling item bought status:", error);
    throw new Error(error.message || "Failed to toggle item bought status");
  }

  const result = data as ToggleItemResult;
  if (result?.is_bought_by_me && result.owner_id) {
    void createLocalizedNotification({
      receiverId: result.owner_id,
      key: "item_bought",
      vars: {},
      entityId: result.wishlist_id ?? null,
    });
  }

  return data as Item;
}

export async function toggleItemReservationSecret(itemId: string): Promise<Item> {
  const { data, error } = await supabaseBrowser.rpc("toggle_item_reservation_secret", {
    p_item_id: itemId,
  });

  if (error) {
    console.error("Error toggling secret item reservation:", error);
    throw new Error(error.message || "Failed to toggle secret reservation");
  }

  return data as Item;
}

export async function toggleItemBoughtSecret(itemId: string): Promise<Item> {
  const { data, error } = await supabaseBrowser.rpc("toggle_item_bought_secret", {
    p_item_id: itemId,
  });

  if (error) {
    console.error("Error toggling secret item bought status:", error);
    throw new Error(error.message || "Failed to toggle secret item bought status");
  }

  return data as Item;
}

export async function uploadItemImage(file: File): Promise<string> {
  return uploadPublicImage({
    file,
    bucket: ITEM_IMAGE_BUCKET,
    maxBytes: 5 * 1024 * 1024,
    oversizeMessage: "Image size must be less than 5MB",
    uploadErrorMessage: "Failed to upload image",
  });
}

export async function deleteItemImage(imageUrl: string): Promise<void> {
  await deletePublicImage({
    imageUrl,
    bucket: ITEM_IMAGE_BUCKET,
  });
}

// ── Item Votes ──

export interface ItemVotesResult {
  counts: Record<string, number>;
  userVotes: Set<string>;
}

export async function getItemVotes(itemIds: string[]): Promise<ItemVotesResult> {
  if (itemIds.length === 0) return { counts: {}, userVotes: new Set() };

  const session = await getCurrentSession();
  const userId = session?.user.id;

  const { data: rows, error } = await supabaseBrowser
    .from("item_vote")
    .select("item_id, user_id")
    .in("item_id", itemIds);

  if (error) throw error;

  const counts: Record<string, number> = {};
  const userVotes = new Set<string>();

  for (const row of rows ?? []) {
    counts[row.item_id] = (counts[row.item_id] ?? 0) + 1;
    if (userId && row.user_id === userId) {
      userVotes.add(row.item_id);
    }
  }

  return { counts, userVotes };
}

export async function toggleItemVote(itemId: string): Promise<void> {
  const session = await getCurrentSession();
  if (!session?.user.id) throw new Error("Not authenticated");

  const { data: existing } = await supabaseBrowser
    .from("item_vote")
    .select("id")
    .eq("item_id", itemId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabaseBrowser.from("item_vote").delete().eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabaseBrowser
      .from("item_vote")
      .insert({ item_id: itemId, user_id: session.user.id });
    if (error) throw error;
  }
}
