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

export interface NotificationPushToken {
  id: string;
  user_id: string;
  expo_push_token: string;
  platform: string | null;
  device_id: string | null;
  app_version: string | null;
  enabled: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export * from "./discover";
export * from "./feature-ideas";
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
