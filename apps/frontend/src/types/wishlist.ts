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

export interface Wishlist {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_date?: string | null;
  visibility_type: WishlistVisibility;
  image_url: string | null;
  accent_type: WishlistAccent;
  created_at: string;
  itemsCount?: number;
}

export interface Item {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  priority: number | null;
  url: string | null;
  status: number; // 0 = available, 1 = reserved, 2 = purchased
  created_at: string;
}