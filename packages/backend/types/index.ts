export type PaginationParams = {
  skip?: number;
  take?: number;
  search?: string;
  sort?: string;
  visibilityTypes?: number[];
  statuses?: number[];
  priorities?: string[];
  priceMin?: number | null;
  priceMax?: number | null;
  displayCurrency?: string;
};

export interface Notification {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_name: string;
  text: string;
  icon_type: number;
  type: number | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export * from "./discover";
export * from "./friends";
export * from "./item";
export * from "./priority";
export * from "./known-accounts";
export * from "./paddle";
export * from "./session-storage";
export * from "./settings";
export * from "./secret-santa";
export * from "./subscription";
export {
  WishlistAccent,
  WishlistVisibility,
  type Item as WishlistItemSummary,
  type RestoredEditWishlistFields,
  type UserStatistics,
  type Wishlist,
  type WishlistColorOption,
  type WishlistDraft,
  type WishlistFormValues,
  type WishlistPrivacyOption,
  type WishlistQueryParams,
  type WishlistUpdateValues,
} from "./wishlist";
