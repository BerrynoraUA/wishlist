import type { TranslateFn } from "@/lib/translate-fn";
import { getValidHttpUrl } from "@/lib/urls";
import type { Item, ItemFormValues, ItemLink } from "@wishlist/backend/types/item";
import { ALL_PRIORITIES, PRIORITY_IDS } from "@wishlist/backend/lib";

export const WISHLIST_ITEMS_PAGE_SIZE = 12;
export const DEFAULT_ITEM_SORT = "newest";

/** For API/filter mapping — value and status without translated label. */
export const ITEM_STATUS_LOOKUP = [
  { value: "available" as const, status: 0 },
  { value: "reserved" as const, status: 1 },
  { value: "purchased" as const, status: 2 },
] as const;

export const ITEM_PRIORITY_LOOKUP = [
  { value: PRIORITY_IDS.LOW, priority_id: PRIORITY_IDS.LOW },
  { value: PRIORITY_IDS.MEDIUM, priority_id: PRIORITY_IDS.MEDIUM },
  { value: PRIORITY_IDS.HIGH, priority_id: PRIORITY_IDS.HIGH },
  { value: PRIORITY_IDS.STAR, priority_id: PRIORITY_IDS.STAR },
] as const;

export function getItemStatusOptions(t: TranslateFn) {
  return [
    { value: "available" as const, label: t("Available"), status: 0 },
    { value: "reserved" as const, label: t("Reserved"), status: 1 },
    { value: "purchased" as const, label: t("Purchased"), status: 2 },
  ];
}

export function getItemPriorityOptions(t: TranslateFn, selectedPriorityIds?: string[]) {
  const selectedIds =
    selectedPriorityIds && selectedPriorityIds.length > 0
      ? selectedPriorityIds
      : ALL_PRIORITIES.filter((priority) => priority.is_free).map((priority) => priority.id);

  return ALL_PRIORITIES.filter((priority) => selectedIds.includes(priority.id))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((priority) => ({
      value: priority.id,
      label: t(priority.name),
      priority_id: priority.id,
      color: priority.color,
      is_free: priority.is_free,
    }));
}

export function getItemSortOptions(t: TranslateFn) {
  return [
    { value: "newest", label: t("Newest first") },
    { value: "oldest", label: t("Oldest first") },
    { value: "name-asc", label: t("Name A to Z") },
    { value: "name-desc", label: t("Name Z to A") },
    { value: "price-high", label: t("Highest price") },
    { value: "price-low", label: t("Lowest price") },
    { value: "priority-high", label: t("Highest priority") },
    { value: "priority-low", label: t("Lowest priority") },
  ];
}

export function getTranslatedItemPriorityLabel(
  t: TranslateFn,
  priorityId: string | null | undefined,
): string | null {
  const priority = ALL_PRIORITIES.find((item) => item.id === priorityId);
  return priority ? t(priority.name) : null;
}

export function getItemPriority(priorityId: string | null | undefined) {
  return ALL_PRIORITIES.find(
    (priority) => priority.id === priorityId || priority.name === priorityId,
  );
}

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
  colorIndex: null,
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
    colorIndex: item.color_index,
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
  const validUrl = getValidHttpUrl(url);
  if (!validUrl) return "";

  try {
    return new URL(validUrl).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
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

export function isDiscountActive(hasDiscount: boolean, discountEndDate: string | null | undefined) {
  if (!hasDiscount) return false;
  if (!discountEndDate) return true;

  const endTime = Date.parse(discountEndDate);
  return Number.isNaN(endTime) || endTime > Date.now();
}

export function getItemReservationState({
  status,
  reservedBy,
  currentUserId,
}: {
  status?: number | null;
  reservedBy?: string | null;
  currentUserId?: string | null;
}) {
  const isPurchased = status === 2;
  const isReserved = status === 1 || Boolean(reservedBy && !isPurchased);
  const reservedByMe = Boolean(currentUserId && reservedBy && reservedBy === currentUserId);

  return {
    isPurchased,
    isReserved,
    reservedByMe,
    // Owners included: marking your own gift reserved or bought is allowed, so the only
    // thing that blocks either toggle is the item already being in someone else's hands.
    canToggleReservation: !isPurchased && (!isReserved || reservedByMe),
    canToggleBought:
      (isPurchased && reservedByMe) || (!isPurchased && (!isReserved || reservedByMe)),
  };
}

export function optimisticallyToggleItemReservation(item: Item, currentUserId: string): Item {
  const releasing = item.status === 1 && item.reserved_by === currentUserId;

  return {
    ...item,
    status: releasing ? 0 : 1,
    reserved_by: releasing ? null : currentUserId,
  };
}

export function optimisticallyToggleItemBought(item: Item, currentUserId: string): Item {
  return {
    ...item,
    status: item.status === 2 ? 1 : 2,
    reserved_by: currentUserId,
  };
}

export function updateItemIfSelected(
  item: Item,
  selectedItemId: string,
  update: (selectedItem: Item) => Item,
): Item {
  return item.id === selectedItemId ? update(item) : item;
}

export function buildReservationLabel(
  args: {
    isPurchased: boolean;
    isReserved: boolean;
    reservedByMe: boolean;
    reservedByName?: string | null;
  },
  t: TranslateFn,
  // Naming the giver is a spoiler, so it only happens when the wishlist owner
  // asks for it item by item. Everyone else always sees the generic status.
  { revealName = false }: { revealName?: boolean } = {},
) {
  const { isPurchased, isReserved, reservedByMe, reservedByName } = args;
  const named = revealName && reservedByName ? reservedByName : null;

  if (isPurchased) {
    if (reservedByMe) return t("Purchased by you");
    return named ? t("Purchased by {name}", { name: named }) : t("Purchased");
  }

  if (!isReserved) return null;
  if (reservedByMe) return t("Reserved by you");
  return named ? t("Reserved by {name}", { name: named }) : t("Reserved");
}
