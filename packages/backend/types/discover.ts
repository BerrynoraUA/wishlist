import type { ItemLink } from "./item";

export type DiscoverQueryParams = {
  skip?: number;
  take?: number;
  search?: string;
  sort?: string;
  priorities?: string[];
  priceMin?: number | null;
  priceMax?: number | null;
  displayCurrency?: string;
};

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
  status?: number;
  isReserved: boolean;
  reserved_by?: string | null;
  reservedBy?: string | null;
  reservedByName?: string | null;
  discount_price?: string | number | null;
  currency?: string | null;
  additional_links?: ItemLink[] | null;
  color_index?: number | null;
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
  status: number;
  wishlist_id: string;
  wishlist_title: string;
  owner_id: string;
  owner_name: string;
  owner_username: string;
  owner_avatar: string;
  discount_price?: string | number | null;
  currency?: string | null;
  additional_links?: ItemLink[] | null;
  color_index?: number | null;
};

export interface FriendUpcomingWishlist {
  friend_name: string;
  wishlist_title: string;
  event_date: string;
  wishlist_id: string;
  friend_id: string;
}
