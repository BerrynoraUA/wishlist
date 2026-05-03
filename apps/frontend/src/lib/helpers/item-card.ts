import type { ItemActionConfirmType } from "@/components/ui/ActionConfirmModal/ActionConfirmModal";
import type { ItemLink } from "@/types/item";

export type ItemCardPriorityKey = "low" | "medium" | "high";
export type ItemCardPriority = string | null;
export type ItemCardPriorityInput = ItemCardPriority | undefined;

type ReservationStateInput = {
  status?: number | null;
  isReserved?: boolean;
  reservedBy?: string | null;
  currentUserId?: string | null;
  isOwner?: boolean;
  reservedByCurrentUser?: boolean;
};

type ReservationStatusLabelFactory = {
  purchasedByYou: () => string;
  purchased: () => string;
  purchasedByName: (name: string) => string;
  reservedByYou: () => string;
  reserved: () => string;
  reservedByName: (name: string) => string;
};

type ReservationActionLabelFactory = {
  purchased: () => string;
  reservedByYou: () => string;
  reserved: () => string;
  available: () => string;
};

type PurchaseActionLabelFactory = {
  purchased: () => string;
  available: () => string;
};

type PriorityLabelFactory = Record<ItemCardPriorityKey, string>;

type SaveItemInput = {
  name: string;
  description?: string | null;
  price?: string | number | null;
  imageUrl?: string | null;
  url?: string | null;
  priority_id?: string | null;
  discountPrice?: string | number | null;
  hasDiscount?: boolean;
  discountEndDate?: string | null;
  currency?: string | null;
  additionalLinks?: ItemLink[] | null;
};

export function getReservedByValue(value: unknown): string | null {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

export function getItemReservationState({
  status,
  isReserved = false,
  reservedBy,
  currentUserId,
  isOwner = false,
  reservedByCurrentUser = false,
}: ReservationStateInput) {
  const reservedByValue = getReservedByValue(reservedBy);
  const isPurchased = status === 2;
  const hasReservation = Boolean(reservedByValue);
  const resolvedIsReserved =
    Boolean(isReserved) || status === 1 || (hasReservation && !isPurchased);
  const reservedByMe =
    reservedByCurrentUser ||
    (Boolean(currentUserId) && Boolean(reservedByValue) && reservedByValue === currentUserId);
  const canToggleReservation = !isOwner && !isPurchased && (!resolvedIsReserved || reservedByMe);
  const canToggleBought =
    !isOwner &&
    ((isPurchased && reservedByMe) || (!isPurchased && (!resolvedIsReserved || reservedByMe)));

  return {
    reservedByValue,
    isPurchased,
    isReserved: resolvedIsReserved,
    reservedByMe,
    canToggleReservation,
    canToggleBought,
  };
}

export function parseItemPriceToNumber(value: string | number | null | undefined): number | null {
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
): number | null {
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

export function getItemPriorityKey(priority: ItemCardPriorityInput): ItemCardPriorityKey | null {
  if (priority == null) return null;

  const normalized = String(priority).toLowerCase();
  if (normalized === "low") return "low";
  if (normalized === "medium") return "medium";
  if (normalized === "high") return "high";

  return null;
}

export function getItemPriorityValue(priority: ItemCardPriorityInput): 1 | 2 | 3 | null {
  const priorityKey = getItemPriorityKey(priority);
  if (priorityKey === "low") return 1;
  if (priorityKey === "medium") return 2;
  if (priorityKey === "high") return 3;
  return null;
}

export function getItemPriorityName(priority: ItemCardPriorityInput): string | null {
  if (priority == null) return null;
  return String(priority);
}

export function buildItemPriorityLabel(
  priority: ItemCardPriorityInput,
  labels: Record<ItemCardPriorityKey, string>,
): string | null {
  const priorityKey = getItemPriorityKey(priority);
  return priorityKey ? labels[priorityKey] : priority ? String(priority) : null;
}

export function getItemStoreFromUrl(url: string | null | undefined): string {
  if (!url) return "";

  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

export function buildReservationStatusLabel(
  state: Pick<
    ReturnType<typeof getItemReservationState>,
    "isPurchased" | "isReserved" | "reservedByMe"
  >,
  reservedByName: string | null | undefined,
  labels: ReservationStatusLabelFactory,
): string | null {
  if (state.isPurchased) {
    if (state.reservedByMe) return labels.purchasedByYou();
    if (reservedByName) return labels.purchasedByName(reservedByName);
    return labels.purchased();
  }

  if (!state.isReserved) return null;
  if (state.reservedByMe) return labels.reservedByYou();
  if (reservedByName) return labels.reservedByName(reservedByName);
  return labels.reserved();
}

export function buildReservationActionLabel(
  state: Pick<
    ReturnType<typeof getItemReservationState>,
    "isPurchased" | "isReserved" | "reservedByMe"
  >,
  labels: ReservationActionLabelFactory,
): string {
  if (state.isPurchased) return labels.purchased();
  if (!state.isReserved) return labels.available();
  if (state.reservedByMe) return labels.reservedByYou();
  return labels.reserved();
}

export function buildPurchaseActionLabel(
  isPurchased: boolean,
  labels: PurchaseActionLabelFactory,
): string {
  return isPurchased ? labels.purchased() : labels.available();
}

export async function shareItemLink(url: string): Promise<void> {
  if (!url) return;

  try {
    if (navigator.share) {
      await navigator.share({ url });
      return;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  } catch {}
}

export function getNextConfirmAction(
  actionType: "reserve" | "purchase",
  active: boolean,
): ItemActionConfirmType {
  if (actionType === "reserve") {
    return active ? "unreserve" : "reserve";
  }

  return active ? "unpurchase" : "purchase";
}

export function buildSaveItemData({
  name,
  description = null,
  price = null,
  imageUrl = null,
  url = null,
  priority_id = null,
  discountPrice = null,
  hasDiscount = false,
  discountEndDate = null,
  currency = null,
  additionalLinks = null,
}: SaveItemInput) {
  return {
    name,
    description,
    price: price != null ? String(price) : null,
    image_url: imageUrl,
    url,
    priority_id,
    discount_price: discountPrice != null ? String(discountPrice) : null,
    has_discount: hasDiscount || discountPrice != null,
    discount_end_date: discountEndDate,
    currency,
    additional_links: additionalLinks,
  };
}
