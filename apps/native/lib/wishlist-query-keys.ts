import type { DiscoverQueryParams } from "@wishlist/backend/types/discover";
import type { WishlistQueryParams } from "@wishlist/backend/types/wishlist";

export const wishlistKeys = {
  all: ["wishlists"] as const,
  my: (authUserId: string | null | undefined, params?: WishlistQueryParams) =>
    [...wishlistKeys.all, "my", "finite", authUserId ?? "anonymous", params] as const,
  infiniteMy: (authUserId: string | null | undefined, params?: WishlistQueryParams) =>
    [...wishlistKeys.all, "my", "infinite", authUserId ?? "anonymous", params] as const,
  friend: (authUserId: string | null | undefined, userId: string, params?: WishlistQueryParams) =>
    [...wishlistKeys.all, "friend", authUserId ?? "anonymous", userId, params] as const,
  discoverAll: (authUserId: string | null | undefined, params?: DiscoverQueryParams) =>
    [...wishlistKeys.all, "discover", "all", authUserId ?? "anonymous", params] as const,
  discoverAvailable: (authUserId: string | null | undefined, params?: DiscoverQueryParams) =>
    [...wishlistKeys.all, "discover", "available", authUserId ?? "anonymous", params] as const,
  discoverReserved: (authUserId: string | null | undefined, params?: DiscoverQueryParams) =>
    [...wishlistKeys.all, "discover", "reserved", authUserId ?? "anonymous", params] as const,
  discoverPurchased: (authUserId: string | null | undefined, params?: DiscoverQueryParams) =>
    [...wishlistKeys.all, "discover", "purchased", authUserId ?? "anonymous", params] as const,
  discoverUpcoming: (authUserId: string | null | undefined) =>
    [...wishlistKeys.all, "discover", "upcoming", authUserId ?? "anonymous"] as const,
  detailRoot: (id: string) => [...wishlistKeys.all, "detail", id] as const,
  detail: (authUserId: string | null | undefined, id: string) =>
    [...wishlistKeys.detailRoot(id), authUserId ?? "anonymous"] as const,
};

export const statisticsKeys = {
  all: ["statistics"] as const,
  my: (authUserId: string | null | undefined) =>
    [...statisticsKeys.all, "my", authUserId ?? "anonymous"] as const,
};
