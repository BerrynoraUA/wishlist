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
  priority: number | null;
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
}

export interface ItemFormValues {
  name: string;
  description: string;
  price: string;
  priority: number | null;
  imageUrl: string;
  url: string;
  currency: string;
  discountPrice: string;
  hasDiscount: boolean;
  discountEndDate: string;
  additionalLinks: ItemLink[];
}

export interface ItemQueryParams {
  skip?: number;
  take?: number;
  search?: string;
  sort?: string;
  statuses?: number[];
  priorities?: number[];
  priceMin?: number | null;
  priceMax?: number | null;
}

export interface CreateItemParams {
  wishlist_id: string;
  name: string;
  description?: string | null;
  price?: string | null;
  priority?: number | null;
  image_url?: string | null;
  url?: string | null;
  status?: number;
  discount_price?: string | null;
  has_discount?: boolean;
  discount_end_date?: string | null;
  currency?: string | null;
  additional_links?: ItemLink[] | null;
}

export type UpdateItemParams = Partial<Omit<CreateItemParams, "wishlist_id">>;

export interface ItemVotesResult {
  counts: Record<string, number>;
  userVotes: Set<string>;
}
