import { supabase } from "@wishlist/backend/supabase/native";
import type {
  CreateItemParams,
  Item,
  ItemQueryParams,
  ItemVotesResult,
  UpdateItemParams,
} from "@wishlist/backend/types/item";
import { createLocalizedNotification } from "@/lib/create-notification";

/** Extra fields the toggle RPCs return alongside the item, used to notify the owner. */
type ToggleItemResult = {
  owner_id?: string | null;
  wishlist_id?: string | null;
  is_reserved_by_me?: boolean;
  is_bought_by_me?: boolean;
};

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

  const { data, error } = await supabase.rpc("get_wishlist_items", {
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

  return (data as Item[]) ?? [];
}

export async function createItem({
  wishlist_id,
  name,
  description,
  price,
  priority_id,
  image_url,
  url,
  status = 0,
  discount_price,
  has_discount,
  discount_end_date,
  currency,
  additional_links,
  color_index,
}: CreateItemParams): Promise<Item> {
  const { data, error } = await supabase
    .from("item")
    .insert({
      wishlist_id,
      name,
      description: description ?? null,
      price: price ?? null,
      priority_id: priority_id ?? null,
      image_url: image_url ?? null,
      url: url ?? null,
      status,
      discount_price: discount_price ?? null,
      has_discount: has_discount ?? false,
      discount_end_date: discount_end_date || null,
      currency: currency ?? null,
      additional_links: additional_links ?? [],
      color_index: color_index ?? null,
    })
    .select()
    .single();

  if (error) throw error;

  return data as Item;
}

export async function updateItem(itemId: string, updates: UpdateItemParams): Promise<Item> {
  const payload: Record<string, unknown> = {};

  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.price !== undefined) payload.price = updates.price;
  if (updates.priority_id !== undefined) payload.priority_id = updates.priority_id;
  if (updates.image_url !== undefined) payload.image_url = updates.image_url;
  if (updates.url !== undefined) payload.url = updates.url;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.discount_price !== undefined) payload.discount_price = updates.discount_price;
  if (updates.has_discount !== undefined) payload.has_discount = updates.has_discount;
  if (updates.discount_end_date !== undefined) {
    payload.discount_end_date = updates.discount_end_date || null;
  }
  if (updates.currency !== undefined) payload.currency = updates.currency;
  if (updates.color_index !== undefined) payload.color_index = updates.color_index;
  if (updates.additional_links !== undefined) {
    payload.additional_links = updates.additional_links ?? [];
  }

  const { data, error } = await supabase
    .from("item")
    .update(payload)
    .eq("id", itemId)
    .select()
    .single();

  if (error) throw error;

  return data as Item;
}

/**
 * Records a report against someone else's item. Resolves to false when this
 * user had already reported it — the same person never counts twice.
 */
export async function reportItem(itemId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("report_item", { p_item_id: itemId });

  if (error) throw error;

  return Boolean(data);
}

export async function deleteItem(itemId: string): Promise<void> {
  const { error } = await supabase.from("item").delete().eq("id", itemId);

  if (error) throw error;
}

export async function toggleItemReservation(itemId: string): Promise<Item> {
  const { data, error } = await supabase.rpc("toggle_item_reservation", {
    p_item_id: itemId,
  });

  if (error) throw new Error(error.message || "Failed to toggle reservation");

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
  const { data, error } = await supabase.rpc("toggle_item_bought", {
    p_item_id: itemId,
  });

  if (error) throw new Error(error.message || "Failed to toggle item bought status");

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

export async function getItemVotes(itemIds: string[]): Promise<ItemVotesResult> {
  if (itemIds.length === 0) return { counts: {}, userVotes: new Set() };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("item_vote")
    .select("item_id, user_id")
    .in("item_id", itemIds);

  if (error) throw error;

  const counts: Record<string, number> = {};
  const userVotes = new Set<string>();

  for (const row of data ?? []) {
    counts[row.item_id] = (counts[row.item_id] ?? 0) + 1;
    if (user?.id && row.user_id === user.id) {
      userVotes.add(row.item_id);
    }
  }

  return { counts, userVotes };
}

export async function toggleItemVote(itemId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("item_vote")
    .select("id")
    .eq("item_id", itemId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("item_vote").delete().eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("item_vote").insert({ item_id: itemId, user_id: user.id });
  if (error) throw error;
}
