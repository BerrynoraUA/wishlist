import {
  createWishlist,
  deleteWishlist,
  getFriendWishlists,
  getFriendsUpcomingWishlists,
  getFriendsWishlistsDiscover,
  getFriendsWishlistsDiscoverAll,
  getFriendsWishlistsPurchasedByMe,
  getFriendsWishlistsReservedByMe,
  getMyStatistics,
  getMyWishlists,
  getWishlistById,
  grantWishlistAccess,
  patchWishlist,
  revokeWishlistAccess,
  updateWishlist,
} from "@/api/wishlists";
import { useSkipTakeInfiniteQuery } from "@/hooks/use-infinite-page";
import { normalizeSearchQuery } from "@/lib/wishlists";
import type { DiscoverQueryParams } from "@wishlist/backend/types/discover";
import { useAuth } from "@/providers/auth-provider";
import type {
  WishlistFormValues,
  WishlistQueryParams,
  WishlistUpdateValues,
} from "@wishlist/backend/types/wishlist";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";

export const wishlistKeys = {
  all: ["wishlists"] as const,
  my: (authUserId: string | null | undefined, params?: WishlistQueryParams) =>
    [...wishlistKeys.all, "my", authUserId ?? "anonymous", params] as const,
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

export function useMyWishlists(params?: WishlistQueryParams) {
  const { user } = useAuth();
  const normalizedParams = params
    ? {
        ...params,
        search: normalizeSearchQuery(params.search) || undefined,
      }
    : undefined;

  return useQuery({
    queryKey: wishlistKeys.my(user?.id, normalizedParams),
    queryFn: () => getMyWishlists(normalizedParams),
    enabled: Boolean(user?.id),
  });
}

export function useInfiniteMyWishlists(params: WishlistQueryParams, pageSize: number) {
  const { user } = useAuth();
  const normalizedParams = React.useMemo(
    () => ({
      ...params,
      skip: undefined,
      take: undefined,
      search: normalizeSearchQuery(params.search) || undefined,
    }),
    [params.search, params.sort, params.visibilityTypes],
  );

  return useSkipTakeInfiniteQuery({
    queryKey: wishlistKeys.my(user?.id, { ...normalizedParams, take: pageSize }),
    fetchPage: ({ skip, take }) =>
      getMyWishlists({
        ...normalizedParams,
        skip,
        take,
      }),
    pageSize,
    enabled: Boolean(user?.id),
  });
}

export function useMyStatistics({ enabled = true }: { enabled?: boolean } = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: statisticsKeys.my(user?.id),
    queryFn: getMyStatistics,
    enabled: enabled && Boolean(user?.id),
  });
}

export function useInfiniteFriendWishlists(
  userId: string,
  params: WishlistQueryParams,
  pageSize: number,
) {
  const { user } = useAuth();
  const normalizedParams = React.useMemo(
    () => ({
      ...params,
      skip: undefined,
      take: undefined,
      search: normalizeSearchQuery(params.search) || undefined,
    }),
    [params.search, params.sort, params.visibilityTypes],
  );

  return useSkipTakeInfiniteQuery({
    queryKey: wishlistKeys.friend(user?.id, userId, { ...normalizedParams, take: pageSize }),
    fetchPage: ({ skip, take }) =>
      getFriendWishlists(userId, {
        ...normalizedParams,
        skip,
        take,
      }),
    pageSize,
    enabled: Boolean(user?.id && userId),
  });
}

function useNormalizedDiscoverParams(params?: DiscoverQueryParams) {
  return React.useMemo(
    () =>
      params
        ? {
            ...params,
            search: normalizeSearchQuery(params.search) || undefined,
            priorities: params.priorities?.length ? params.priorities : undefined,
            priceMin: params.priceMin ?? undefined,
            priceMax: params.priceMax ?? undefined,
          }
        : undefined,
    [
      params?.displayCurrency,
      params?.priceMax,
      params?.priceMin,
      params?.priorities,
      params?.search,
      params?.skip,
      params?.sort,
      params?.take,
    ],
  );
}

export function useInfiniteFriendsWishlistsDiscoverAll(
  params: DiscoverQueryParams,
  pageSize: number,
  enabled = true,
) {
  const { user } = useAuth();
  const normalizedParams = useNormalizedDiscoverParams(params);

  return useSkipTakeInfiniteQuery({
    queryKey: wishlistKeys.discoverAll(user?.id, { ...normalizedParams, take: pageSize }),
    fetchPage: ({ skip, take }) =>
      getFriendsWishlistsDiscoverAll({
        ...normalizedParams,
        skip,
        take,
      }),
    pageSize,
    enabled: Boolean(user?.id) && enabled,
  });
}

export function useInfiniteFriendsWishlistsDiscover(
  params: DiscoverQueryParams,
  pageSize: number,
  enabled = true,
) {
  const { user } = useAuth();
  const normalizedParams = useNormalizedDiscoverParams(params);

  return useSkipTakeInfiniteQuery({
    queryKey: wishlistKeys.discoverAvailable(user?.id, { ...normalizedParams, take: pageSize }),
    fetchPage: ({ skip, take }) =>
      getFriendsWishlistsDiscover({
        ...normalizedParams,
        skip,
        take,
      }),
    pageSize,
    enabled: Boolean(user?.id) && enabled,
  });
}

export function useInfiniteFriendsWishlistsReservedByMe(
  params: DiscoverQueryParams,
  pageSize: number,
  enabled = true,
) {
  const { user } = useAuth();
  const normalizedParams = useNormalizedDiscoverParams(params);

  return useSkipTakeInfiniteQuery({
    queryKey: wishlistKeys.discoverReserved(user?.id, { ...normalizedParams, take: pageSize }),
    fetchPage: ({ skip, take }) =>
      getFriendsWishlistsReservedByMe({
        ...normalizedParams,
        skip,
        take,
      }),
    pageSize,
    enabled: Boolean(user?.id) && enabled,
  });
}

export function useInfiniteFriendsWishlistsPurchasedByMe(
  params: DiscoverQueryParams,
  pageSize: number,
  enabled = true,
) {
  const { user } = useAuth();
  const normalizedParams = useNormalizedDiscoverParams(params);

  return useSkipTakeInfiniteQuery({
    queryKey: wishlistKeys.discoverPurchased(user?.id, { ...normalizedParams, take: pageSize }),
    fetchPage: ({ skip, take }) =>
      getFriendsWishlistsPurchasedByMe({
        ...normalizedParams,
        skip,
        take,
      }),
    pageSize,
    enabled: Boolean(user?.id) && enabled,
  });
}

export function useFriendsUpcomingWishlists() {
  const { user } = useAuth();

  return useQuery({
    queryKey: wishlistKeys.discoverUpcoming(user?.id),
    queryFn: getFriendsUpcomingWishlists,
    enabled: Boolean(user?.id),
  });
}

export function useCreateWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: WishlistFormValues) => createWishlist(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
      await queryClient.invalidateQueries({ queryKey: statisticsKeys.all });
    },
  });
}

export function useUpdateWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: WishlistFormValues }) =>
      updateWishlist(id, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
      await queryClient.invalidateQueries({ queryKey: statisticsKeys.all });
    },
  });
}

export function usePatchWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: WishlistUpdateValues }) =>
      patchWishlist(id, values),
    onSuccess: async (wishlist) => {
      await queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
      await queryClient.invalidateQueries({ queryKey: wishlistKeys.detailRoot(wishlist.id) });
      await queryClient.invalidateQueries({ queryKey: statisticsKeys.all });
    },
  });
}

export function useWishlistById(wishlistId: string, { enabled = true }: { enabled?: boolean } = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: wishlistKeys.detail(user?.id, wishlistId),
    queryFn: () => getWishlistById(wishlistId),
    enabled: enabled && Boolean(user?.id && wishlistId),
  });
}

export function useDeleteWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWishlist(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
      await queryClient.invalidateQueries({ queryKey: statisticsKeys.all });
    },
  });
}

export function useGrantWishlistAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      wishlistId,
      grantedToUserId,
      accessType,
    }: {
      wishlistId: string;
      grantedToUserId: string;
      accessType: 0 | 1 | 2 | 3;
    }) => grantWishlistAccess(wishlistId, grantedToUserId, accessType),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
      await queryClient.invalidateQueries({
        queryKey: ["friends-without-wishlist-access"],
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: ["wishlist-access-list"],
        exact: false,
      });
    },
  });
}

export function useRevokeWishlistAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ wishlistId, targetUserId }: { wishlistId: string; targetUserId: string }) =>
      revokeWishlistAccess(wishlistId, targetUserId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["friends-without-wishlist-access"],
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: ["wishlist-access-list"],
        exact: false,
      });
    },
  });
}
