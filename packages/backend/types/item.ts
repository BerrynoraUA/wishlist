export interface ItemLink {
  url: string;
  title?: string;
}

export interface Item {
  id: string;
  wishlist_id: string;
  name: string;
  description: string | null;
  price: string | null;
  priority_id: string | null;
  priority_name: string | null;
  image_url: string | null;
  url: string | null;
  created_at: string;
  status: number;
  reserved_by: string | null;
  discount_price: string | null;
  has_discount: boolean;
  discount_end_date: string | null;
  currency: string | null;
  additional_links: ItemLink[] | null;
  /** Index into ITEM_COLORS; null means the card keeps its neutral frame. */
  color_index: number | null;
}

export interface ItemFormValues {
  name: string;
  description: string;
  price: string;
  priority_id: string | null;
  imageUrl: string;
  url: string;
  currency: string;
  discountPrice: string;
  hasDiscount: boolean;
  discountEndDate: string;
  additionalLinks: ItemLink[];
  colorIndex: number | null;
}

export interface ItemQueryParams {
  skip?: number;
  take?: number;
  search?: string;
  sort?: string;
  statuses?: number[];
  priorities?: string[];
  priceMin?: number | null;
  priceMax?: number | null;
}

export interface CreateItemParams {
  wishlist_id: string;
  name: string;
  description?: string | null;
  price?: string | null;
  priority_id?: string | null;
  image_url?: string | null;
  url?: string | null;
  status?: number;
  discount_price?: string | null;
  has_discount?: boolean;
  discount_end_date?: string | null;
  currency?: string | null;
  additional_links?: ItemLink[] | null;
  color_index?: number | null;
}

export type UpdateItemParams = Partial<Omit<CreateItemParams, "wishlist_id">>;

export interface ItemVotesResult {
  counts: Record<string, number>;
  userVotes: Set<string>;
}
