import {
  checkFriendship,
  getFriendsWithoutWishlistAccess,
  getProfilesByIds,
  getWishlistAccessList,
} from "@/api/friends";
import { normalizeSearchQuery } from "@/lib/wishlists";
import type { GetFriendsWithoutWishlistAccessParams } from "@wishlist/backend/types/friends";
import { useQuery } from "@tanstack/react-query";

export const friendKeys = {
  all: ["friends"] as const,
  check: (userId: string) => [...friendKeys.all, "check", userId] as const,
  profilesByIds: (idsKey: string) => [...friendKeys.all, "profiles-by-ids", idsKey] as const,
};

export function useCheckFriendship(userId: string) {
  return useQuery({
    queryKey: friendKeys.check(userId),
    queryFn: () => checkFriendship(userId),
    enabled: Boolean(userId),
  });
}

export function useProfilesByIds(userIds: string[]) {
  const idsKey = userIds.length ? [...userIds].sort().join("|") : "";

  return useQuery({
    queryKey: friendKeys.profilesByIds(idsKey),
    queryFn: () => getProfilesByIds(userIds),
    enabled: userIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFriendsWithoutWishlistAccess(params: GetFriendsWithoutWishlistAccessParams) {
  const { wishlistId, search, skip = 0, take = 20 } = params;
  const normalizedSearch = normalizeSearchQuery(search) || undefined;

  return useQuery({
    queryKey: ["friends-without-wishlist-access", wishlistId, normalizedSearch ?? "", skip, take],
    queryFn: () =>
      getFriendsWithoutWishlistAccess({
        wishlistId,
        search: normalizedSearch,
        skip,
        take,
      }),
    enabled: Boolean(wishlistId),
  });
}

export function useWishlistAccessList(wishlistId?: string) {
  return useQuery({
    queryKey: ["wishlist-access-list", wishlistId],
    queryFn: () => getWishlistAccessList(wishlistId!),
    enabled: Boolean(wishlistId),
  });
}
