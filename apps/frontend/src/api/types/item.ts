import type { ItemLink } from "@/types/item";

export interface CreateItemParams {
  wishlist_id: string;
  name: string;
  description?: string | null;
  price?: string | null;
  priority_id?: string | null;
  color_index?: number | null;
  image?: File | null;
  image_url?: string | null;
  url?: string | null;
  status?: number;
  discount_price?: string | null;
  has_discount?: boolean;
  discount_end_date?: string | null;
  currency?: string | null;
  additional_links?: ItemLink[] | null;
}

export interface UpdateItemParams {
  name?: string;
  description?: string | null;
  price?: string | null;
  priority_id?: string | null;
  color_index?: number | null;
  image_url?: string | null;
  url?: string | null;
  status?: number;
  reserved_by?: string | null;
  image?: File | null;
  removeImage?: boolean;
  discount_price?: string | null;
  has_discount?: boolean;
  discount_end_date?: string | null;
  currency?: string | null;
  additional_links?: ItemLink[] | null;
}
