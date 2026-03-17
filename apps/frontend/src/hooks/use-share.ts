import { getWishlistByToken, getWishlistItemsByToken } from "@/api/share";
import { useQuery } from "@tanstack/react-query";

export const wishlistKeys = {
  all: ["wishlists"] as const,
  detail: (token: string) => [...wishlistKeys.all, "detail", token] as const,
  items: (token: string, params?: PaginationParams) =>
    [...wishlistKeys.all, "items", token, params] as const,
};

export function useWishlistByToken(token: string) {
  return useQuery({
    queryKey: wishlistKeys.detail(token),
    queryFn: () => getWishlistByToken(token),
    enabled: !!token,
  });
}

export function useWishlistItemsByToken(
  token: string,
  params?: PaginationParams,
) {
  return useQuery({
    queryKey: wishlistKeys.items(token, params),
    queryFn: () => getWishlistItemsByToken(token, params),
    enabled: !!token,
  });
}
