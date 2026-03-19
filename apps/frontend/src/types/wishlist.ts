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
