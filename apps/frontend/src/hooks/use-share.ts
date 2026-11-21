import { getWishlistByToken, getWishlistItemsByToken } from "@/api/share";
import { useQuery } from "@tanstack/react-query";

export const wishlistKeys = {
  all: ["wishlists"] as const,
  detail: (token: string) => [...wishlistKeys.all, "detail", token] as const,
  items: (token: string, params?: PaginationParams) =>
    [...wishlistKeys.all, "items", token, params] as const,
};

// Most failures here are expired or revoked links, which retrying can't fix; one retry
// covers a network blip without leaving a visitor on a blank page for several seconds.
const SHARE_QUERY_RETRY = 1;

export function useWishlistByToken(token: string) {
  return useQuery({
    queryKey: wishlistKeys.detail(token),
    queryFn: () => getWishlistByToken(token),
    enabled: !!token,
    retry: SHARE_QUERY_RETRY,
  });
}

export function useWishlistItemsByToken(token: string, params?: PaginationParams) {
  return useQuery({
    queryKey: wishlistKeys.items(token, params),
    queryFn: () => getWishlistItemsByToken(token, params),
    enabled: !!token,
    retry: SHARE_QUERY_RETRY,
  });
}
