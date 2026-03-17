export interface CreateItemParams {
  wishlist_id: string;
  name: string;
  description?: string | null;
  price?: string | null;
  priority?: number | null;
  image_uri?: string | null;
  image_url?: string | null;
  url?: string | null;
  status?: number;
  discount_price?: string | null;
  has_discount?: boolean;
  discount_end_date?: string | null;
}

export interface UpdateItemParams {
  name?: string;
  description?: string | null;
  price?: string | null;
  priority?: number | null;
  image_url?: string | null;
  url?: string | null;
  status?: number;
  reserved_by?: string | null;
  image_uri?: string | null;
  removeImage?: boolean;
  discount_price?: string | null;
  has_discount?: boolean;
  discount_end_date?: string | null;
}
