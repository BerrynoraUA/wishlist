export type DiscoverItem = {
  id: string;
  title: string;
  price: number;
  store: string;
  image: string;
  priority?: "Low" | "Medium" | "High";
};

export type DiscoverSection = {
  id: string;
  owner: string;
  username: string;
  wishlist: string;
  date?: string;
  items: DiscoverItem[];
};
