import { Wishlist } from "@/types/wishlist";

export const stats = [
  { label: "Wishlists", value: 5 },
  { label: "Total Items", value: 46 },
  { label: "Reserved", value: 3 },
  { label: "Purchased", value: 2 },
];

export const wishlists: Wishlist[] = [
  {
    id: "1",
    title: "Birthday Wishes",
    itemsCount: 8,
    visibility: "Friends only",
    accent: "pink",
  },
  {
    id: "2",
    title: "Home Office Setup",
    itemsCount: 5,
    visibility: "Public",
    accent: "blue",
  },
  {
    id: "3",
    title: "Kitchen Essentials",
    itemsCount: 12,
    visibility: "Friends only",
    accent: "peach",
  },
  {
    id: "4",
    title: "Travel Gear",
    itemsCount: 6,
    visibility: "Private",
    accent: "mint",
  },
  {
    id: "5",
    title: "Books to Read",
    itemsCount: 15,
    visibility: "Public",
    accent: "lavender",
  },
];
