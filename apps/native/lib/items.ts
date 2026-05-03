import type { Item, ItemFormValues, ItemLink } from "@wishlist/backend/types/item";
import { ALL_PRIORITIES, PRIORITY_IDS } from "@wishlist/backend/lib";

export const WISHLIST_ITEMS_PAGE_SIZE = 12;
export const DEFAULT_ITEM_SORT = "newest";

export const ITEM_STATUS_OPTIONS = [
  { value: "available", label: "Available", status: 0 },
  { value: "reserved", label: "Reserved", status: 1 },
  { value: "purchased", label: "Purchased", status: 2 },
] as const;

export const ITEM_PRIORITY_OPTIONS = [
  { value: PRIORITY_IDS.HIGH, label: "High", priority_id: PRIORITY_IDS.HIGH },
  { value: PRIORITY_IDS.MEDIUM, label: "Medium", priority_id: PRIORITY_IDS.MEDIUM },
  { value: PRIORITY_IDS.LOW, label: "Low", priority_id: PRIORITY_IDS.LOW },
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
  priority_id: null,
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
    priority_id: item.priority_id,
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

export function getItemPriorityLabel(priorityId: string | null | undefined) {
  return ALL_PRIORITIES.find((priority) => priority.id === priorityId)?.name ?? null;
}

export function parseItemPriceToNumber(value: string | number | null | undefined) {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const safe = trimmed.replace(/[^0-9,.-]/g, "");
  if (!safe) return null;

  const hasComma = safe.includes(",");
  const hasDot = safe.includes(".");
  const normalized = hasComma && hasDot ? safe.replace(/,/g, "") : safe.replace(/,/g, ".");
  const parsed = Number.parseFloat(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

export function getSalePercentOff(
  basePrice: string | number | null | undefined,
  discountPrice: string | number | null | undefined,
  enabled = true,
) {
  if (!enabled || discountPrice == null) return null;

  const base = parseItemPriceToNumber(basePrice);
  const discounted = parseItemPriceToNumber(discountPrice);
  if (!base || !discounted) return null;
  if (base <= 0 || discounted >= base) return null;

  const raw = ((base - discounted) / base) * 100;
  const rounded = Math.round(raw);
  if (!Number.isFinite(rounded) || rounded <= 0) return null;

  return Math.min(99, rounded);
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
