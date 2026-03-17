export interface ProductData {
  title: string | null;
  description: string | null;
  image: string | null;
  price: string | null;
  discount_price: string | null;
  has_discount: boolean;
  discount_end_date: string | null;
}

export type ScraperMethod = (html: string, url: string) => ProductData;

export function emptyProduct(): ProductData {
  return {
    title: null,
    description: null,
    image: null,
    price: null,
    discount_price: null,
    has_discount: false,
    discount_end_date: null,
  };
}
