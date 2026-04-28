import type { Item, ItemFormValues, ItemLink } from "@wishlist/backend/types/item";

export const WISHLIST_ITEMS_PAGE_SIZE = 12;
export const DEFAULT_ITEM_SORT = "newest";

export const ITEM_STATUS_OPTIONS = [
  { value: "available", label: "Available", status: 0 },
  { value: "reserved", label: "Reserved", status: 1 },
  { value: "purchased", label: "Purchased", status: 2 },
] as const;

export const ITEM_PRIORITY_OPTIONS = [
  { value: "3", label: "High", priority: 3 },
  { value: "2", label: "Medium", priority: 2 },
  { value: "1", label: "Low", priority: 1 },
] as const;

export const ITEM_SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name-asc", label: "Name A to Z" },
  { value: "name-desc", label: "Name Z to A" },
  { value: "price-high", label: "Highest price" },
  { value: "price-low", label: "Lowest price" },
  { value: "priority-high", label: "Highest priority" },
  { value: "priority-low", label: "Lowest priority" },
] as const;

export const EMPTY_ITEM_FORM: ItemFormValues = {
  name: "",
  description: "",
  price: "",
  priority: null,
  imageUrl: "",
  url: "",
  currency: "USD",
  discountPrice: "",
  hasDiscount: false,
  discountEndDate: "",
  additionalLinks: [],
};

export function normalizeItemSearch(value?: string) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toItemFormValues(item?: Item): ItemFormValues {
  if (!item) return EMPTY_ITEM_FORM;

  return {
    name: item.name,
    description: item.description ?? "",
    price: item.price ?? "",
    priority: item.priority,
    imageUrl: item.image_url ?? "",
    url: item.url ?? "",
    currency: item.currency ?? "USD",
    discountPrice: item.discount_price ?? "",
    hasDiscount: item.has_discount,
    discountEndDate: item.discount_end_date?.slice(0, 10) ?? "",
    additionalLinks: item.additional_links ?? [],
  };
}

export function cleanAdditionalLinks(links: ItemLink[]) {
  return links
    .map((link) => ({
      url: link.url.trim(),
      title: link.title?.trim() || undefined,
    }))
    .filter((link) => link.url);
}

export function getItemStoreFromUrl(url: string | null | undefined) {
  if (!url) return "";

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function getItemPriorityLabel(priority: number | null | undefined) {
  if (priority === 3) return "High";
  if (priority === 2) return "Medium";
  if (priority === 1) return "Low";
  return null;
}

export function getItemReservationState({
  status,
  reservedBy,
  currentUserId,
  isOwner,
}: {
  status?: number | null;
  reservedBy?: string | null;
  currentUserId?: string | null;
  isOwner?: boolean;
}) {
  const isPurchased = status === 2;
  const isReserved = status === 1 || Boolean(reservedBy && !isPurchased);
  const reservedByMe = Boolean(currentUserId && reservedBy && reservedBy === currentUserId);

  return {
    isPurchased,
    isReserved,
    reservedByMe,
    canToggleReservation: !isOwner && !isPurchased && (!isReserved || reservedByMe),
    canToggleBought:
      !isOwner &&
      ((isPurchased && reservedByMe) || (!isPurchased && (!isReserved || reservedByMe))),
  };
}

export function buildReservationLabel({
  isPurchased,
  isReserved,
  reservedByMe,
  reservedByName,
}: {
  isPurchased: boolean;
  isReserved: boolean;
  reservedByMe: boolean;
  reservedByName?: string | null;
}) {
  if (isPurchased) {
    if (reservedByMe) return "Purchased by you";
    return reservedByName ? `Purchased by ${reservedByName}` : "Purchased";
  }

  if (!isReserved) return null;
  if (reservedByMe) return "Reserved by you";
  return reservedByName ? `Reserved by ${reservedByName}` : "Reserved";
}
