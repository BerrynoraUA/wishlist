import type { DiscoverItem, ReservedItem } from "@/api/types/wishilst";
import type { Item } from "@/types/item";
import { getItemStoreFromUrl } from "@/lib/helpers/item-card";
import { ALL_PRIORITIES } from "@/lib/priorities";
import type { ItemCardData } from "./types";

/**
 * Display name for a priority, resolved from the client's canonical list. The
 * id wins over the stored name: a name that drifts from the seed leaves the
 * badge without its colour and icon, since the card matches on the name.
 */
function resolvePriorityName(
  priorityId: string | null | undefined,
  priorityName: string | null | undefined,
): string | null {
  const byId = priorityId ? ALL_PRIORITIES.find((p) => p.id === priorityId) : null;
  return byId?.name ?? priorityName ?? null;
}

export function normalizeDiscoverItem(item: DiscoverItem): ItemCardData {
  return {
    id: item.id,
    name: item.title,
    image: item.image_url || item.image || null,
    price: item.price,
    store: item.store || null,
    url: item.url ?? null,
    shareUrl: item.share_url || item.url || null,
    description: item.description ?? null,
    priority: resolvePriorityName(item.priority_id, item.priority),
    discountPrice: item.discount_price ?? null,
    currency: item.currency ?? null,
    status: item.status ?? null,
    isReserved: item.isReserved,
    reservedBy: (item.reservedBy ?? item.reserved_by ?? null)?.toString() ?? null,
    reservedByName: item.reservedByName ?? null,
    discountEndDate: item.discount_end_date ?? null,
  };
}

export function normalizeReservedItem(item: ReservedItem): ItemCardData {
  return {
    id: item.item_id,
    name: item.title,
    image: item.image || null,
    price: item.price,
    store: item.store || null,
    url: item.url ?? null,
    shareUrl: item.share_url || item.url || null,
    description: null,
    priority: item.priority_name,
    discountPrice: item.discount_price ?? null,
    currency: item.currency ?? null,
    status: item.status,
    isReserved: item.status !== 2,
    reservedBy: null,
    reservedByName: null,
    discountEndDate: item.discount_end_date ?? null,
  };
}

export function normalizeWishlistItem(item: Item, reservedByName?: string | null): ItemCardData {
  return {
    id: item.id,
    name: item.name,
    image: item.image_url,
    price: item.price,
    store: getItemStoreFromUrl(item.url),
    url: item.url,
    shareUrl: item.url,
    description: item.description,
    priority: resolvePriorityName(item.priority_id, item.priority_name),
    discountPrice: item.has_discount ? item.discount_price : null,
    discountEndDate: item.discount_end_date,
    currency: item.currency,
    status: item.status,
    isReserved: false,
    reservedBy: item.reserved_by,
    reservedByName: reservedByName ?? null,
  };
}
