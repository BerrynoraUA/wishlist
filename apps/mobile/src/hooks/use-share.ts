import { getWishlistByToken, getWishlistItemsByToken } from "@/api/share";
import { useQuery } from "@tanstack/react-query";
import type { PaginationParams } from "@/types";

export const shareKeys = {
  all: ["share-wishlists"] as const,
  detail: (token: string) => [...shareKeys.all, "detail", token] as const,
  items: (token: string, params?: PaginationParams) =>
    [...shareKeys.all, "items", token, params] as const,
};

export function useWishlistByToken(token: string) {
  return useQuery({
    queryKey: shareKeys.detail(token),
    queryFn: () => getWishlistByToken(token),
    enabled: !!token,
  });
}

export function useWishlistItemsByToken(
  token: string,
  params?: PaginationParams
) {
  return useQuery({
    queryKey: shareKeys.items(token, params),
    queryFn: () => getWishlistItemsByToken(token, params),
    enabled: !!token,
  });
}
