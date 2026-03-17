export interface Item {
  id: string;
  wishlist_id: string;
  name: string;
  description: string | null;
  price: string | null;
  priority: number | null;
  image_url: string | null;
  url: string | null;
  created_at: string;
  status: number;
  reserved_by: string | null;
  discount_price: string | null;
  has_discount: boolean;
  discount_end_date: string | null;
}