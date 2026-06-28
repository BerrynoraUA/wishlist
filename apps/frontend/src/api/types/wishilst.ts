import { Item, WishlistAccent, WishlistVisibility } from "@/types/wishlist";
import type { ItemLink } from "@/types/item";

export interface CreateWishlistParams {
  title: string;
  description?: string;
  visibility?: WishlistVisibility;
  image?: File | null;
  imageUrl?: string | null;
  event_date?: Date;
  accent?: WishlistAccent;
}

export interface UpdateWishlistParams {
  title?: string;
  description?: string;
  visibility?: WishlistVisibility;
  image?: File | null;
  imageUrl?: string | null;
  removeImage?: boolean;
  event_date?: Date | null;
  accent?: WishlistAccent;
}

export interface WishlistWithItems {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  items_count: number;
  items: Item[];
}

export type DiscoverItem = {
  id: string;
  title: string;
  price: string | number | null;
  store: string;
  image: string;
  image_url?: string | null;
  url?: string | null;
  share_url?: string | null;
  description?: string | null;
  priority?: string | null;
  priority_id?: string | null;
  color_index?: number | null;
  status?: number;
  isReserved: boolean;
  reserved_by?: string | null;
  reservedBy?: string | null;
  reservedByName?: string | null;
  discount_price?: string | number | null;
  discount_end_date?: string | null;
  currency?: string | null;
  additional_links?: ItemLink[] | null;
};

export type DiscoverSection = {
  id: string;
  owner: string;
  username: string;
  avatar_url?: string | null;
  wishlist: string;
  date?: string;
  friend_id?: string;
  wishlist_id?: string;
  items: DiscoverItem[];
};

export type ReservedItem = {
  item_id: string;
  title: string;
  price: string | number | null;
  store: string;
  image: string;
  url?: string | null;
  share_url?: string | null;
  priority_name: string | null;
  color_index?: number | null;
  status: number;
  wishlist_id: string;
  wishlist_title: string;
  owner_id: string;
  owner_name: string;
  owner_username: string;
  owner_avatar: string;
  discount_price?: string | number | null;
  discount_end_date?: string | null;
  currency?: string | null;
  additional_links?: ItemLink[] | null;
};

export interface FriendUpcomingWishlist {
  friend_name: string;
  wishlist_title: string;
  event_date: string;
  wishlist_id: string;
  friend_id: string;
}
