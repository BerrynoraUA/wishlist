import {
  checkFriendship,
  getFriendGroups,
  getFriendGroupsWithoutWishlistAccess,
  getFriends,
  getFriendsWithoutWishlistAccess,
  getProfilesByIds,
  getWishlistAccessList,
  grantWishlistGroupAccess,
  revokeWishlistGroupAccess,
} from "@/api/friends";
import { normalizeSearchQuery } from "@/lib/wishlists";
import type { GetFriendsWithoutWishlistAccessParams } from "@wishlist/backend/types/friends";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { wishlistKeys } from "./use-wishlists";

type PaginationParams = {
  skip?: number;
  take?: number;
  search?: string;
};

export const friendKeys = {
  all: ["friends"] as const,
  lists: () => [...friendKeys.all, "list"] as const,
  list: (params?: PaginationParams) => [...friendKeys.lists(), params] as const,
  groups: () => [...friendKeys.all, "groups"] as const,
  groupList: (params?: PaginationParams) => [...friendKeys.groups(), params] as const,
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

export function useFriends(params?: PaginationParams) {
  const normalizedParams = params
    ? {
        ...params,
        search: normalizeSearchQuery(params.search) || undefined,
      }
    : undefined;

  return useQuery({
    queryKey: friendKeys.list(normalizedParams),
    queryFn: () => getFriends(normalizedParams),
  });
}

export function useFriendGroups(params?: PaginationParams) {
  const normalizedParams = params
    ? {
        ...params,
        search: normalizeSearchQuery(params.search) || undefined,
      }
    : undefined;

  return useQuery({
    queryKey: friendKeys.groupList(normalizedParams),
    queryFn: () => getFriendGroups(normalizedParams),
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

export function useFriendGroupsWithoutWishlistAccess(
  params: GetFriendsWithoutWishlistAccessParams,
) {
  const { wishlistId, search, skip = 0, take = 20 } = params;
  const normalizedSearch = normalizeSearchQuery(search) || undefined;

  return useQuery({
    queryKey: [
      "friend-groups-without-wishlist-access",
      wishlistId,
      normalizedSearch ?? "",
      skip,
      take,
    ],
    queryFn: () =>
      getFriendGroupsWithoutWishlistAccess({
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

export function useGrantWishlistGroupAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ wishlistId, groupId }: { wishlistId: string; groupId: string }) =>
      grantWishlistGroupAccess(wishlistId, groupId),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
      await queryClient.invalidateQueries({
        queryKey: ["wishlist-access-list", variables.wishlistId],
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: ["friend-groups-without-wishlist-access", variables.wishlistId],
        exact: false,
      });
    },
  });
}

export function useRevokeWishlistGroupAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ wishlistId, groupId }: { wishlistId: string; groupId: string }) =>
      revokeWishlistGroupAccess(wishlistId, groupId),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
      await queryClient.invalidateQueries({
        queryKey: ["wishlist-access-list", variables.wishlistId],
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: ["friend-groups-without-wishlist-access", variables.wishlistId],
        exact: false,
      });
    },
  });
}
