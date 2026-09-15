import type { DiscoverItem, ReservedItem } from "@wishlist/backend/types/discover";
import type { Item } from "@wishlist/backend/types/item";

export const DISCOVER_PAGE_SIZE = 10;

export const DISCOVER_SECTION_TABS = ["wishlists", "available"] as const;

export type DiscoverTab = "wishlists" | "available" | "reserved" | "purchased";

export function isDiscoverSectionTab(tab: DiscoverTab) {
  return (DISCOVER_SECTION_TABS as readonly DiscoverTab[]).includes(tab);
}

export function normalizeDiscoverItem(item: DiscoverItem): Item {
  return {
    id: item.id,
    wishlist_id: "",
    name: item.title,
    description: item.description ?? null,
    price: item.price == null ? null : String(item.price),
    priority_id: item.priority_id ?? item.priority ?? null,
    priority_name: item.priority ?? null,
    image_url: item.image_url ?? item.image ?? null,
    url: item.url ?? item.share_url ?? null,
    created_at: "",
    status: item.status ?? (item.isReserved ? 1 : 0),
    reserved_by: item.reserved_by ?? item.reservedBy ?? null,
    discount_price: item.discount_price == null ? null : String(item.discount_price),
    has_discount: Boolean(item.discount_price),
    discount_end_date: null,
    currency: item.currency ?? null,
    additional_links: item.additional_links ?? null,
    color_index: item.color_index ?? null,
  };
}

export function normalizeReservedItem(item: ReservedItem, currentUserId?: string | null): Item {
  return {
    id: item.item_id,
    wishlist_id: item.wishlist_id,
    name: item.title,
    description: null,
    price: item.price == null ? null : String(item.price),
    priority_id: item.priority_name,
    priority_name: item.priority_name,
    image_url: item.image || null,
    url: item.url ?? item.share_url ?? null,
    created_at: "",
    status: item.status,
    reserved_by: currentUserId ?? null,
    discount_price: item.discount_price == null ? null : String(item.discount_price),
    has_discount: Boolean(item.discount_price),
    discount_end_date: null,
    currency: item.currency ?? null,
    additional_links: item.additional_links ?? null,
    color_index: item.color_index ?? null,
  };
}

export function getDaysUntil(dateValue: string) {
  const dateKey = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const eventDate = dateKey
    ? new Date(Number(dateKey[1]), Number(dateKey[2]) - 1, Number(dateKey[3]))
    : new Date(dateValue);
  if (Number.isNaN(eventDate.getTime())) return null;

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const eventStart = new Date(
    eventDate.getFullYear(),
    eventDate.getMonth(),
    eventDate.getDate(),
  ).getTime();

  return Math.ceil((eventStart - todayStart) / 86_400_000);
}

export function formatDiscoverDate(dateValue?: string) {
  if (!dateValue) return "";
  const dateKey = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = dateKey
    ? new Date(Date.UTC(Number(dateKey[1]), Number(dateKey[2]) - 1, Number(dateKey[3]), 12))
    : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: dateKey ? "UTC" : undefined,
  }).format(date);
}
