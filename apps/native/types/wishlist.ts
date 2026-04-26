export enum WishlistVisibility {
  Public = 0,
  FriendsOnly = 1,
  Private = 2,
}

export enum WishlistAccent {
  Pink = 0,
  Blue = 1,
  Peach = 2,
  Mint = 3,
  Lavender = 4,
}

export type Wishlist = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  created_at: string | null;
  visibility_type: WishlistVisibility;
  accent_type: WishlistAccent;
  event_date: string | null;
  items_count: number;
  can_edit: boolean;
  is_owner: boolean;
  access_type: number | null;
  owner_nickname: string | null;
};

export type WishlistFormValues = {
  title: string;
  description: string;
  visibility: WishlistVisibility;
  accent: WishlistAccent;
  eventDate: string;
  imageUrl: string;
};

export type WishlistQueryParams = {
  skip?: number;
  take?: number;
  search?: string;
  sort?: string;
  visibilityTypes?: WishlistVisibility[];
};

export type UserStatistics = {
  wishlists_count: number;
  total_items_count: number;
  reserved_items_count: number;
  purchased_items_count: number;
};
