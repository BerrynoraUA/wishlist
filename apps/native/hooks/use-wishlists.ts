import {
  createWishlist,
  deleteWishlist,
  getMyStatistics,
  getMyWishlists,
  getWishlistById,
  grantWishlistAccess,
  patchWishlist,
  revokeWishlistAccess,
  updateWishlist,
} from "@/api/wishlists";
import { normalizeSearchQuery } from "@/lib/wishlists";
import type {
  WishlistFormValues,
  WishlistQueryParams,
  WishlistUpdateValues,
} from "@/types/wishlist";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const wishlistKeys = {
  all: ["wishlists"] as const,
  my: (params?: WishlistQueryParams) => [...wishlistKeys.all, "my", params] as const,
  detail: (id: string) => [...wishlistKeys.all, "detail", id] as const,
};

export const statisticsKeys = {
  all: ["statistics"] as const,
  my: () => [...statisticsKeys.all, "my"] as const,
};

export function useMyWishlists(params?: WishlistQueryParams) {
  const normalizedParams = params
    ? {
        ...params,
        search: normalizeSearchQuery(params.search) || undefined,
      }
    : undefined;

  return useQuery({
    queryKey: wishlistKeys.my(normalizedParams),
    queryFn: () => getMyWishlists(normalizedParams),
    placeholderData: keepPreviousData,
  });
}

export function useMyStatistics() {
  return useQuery({
    queryKey: statisticsKeys.my(),
    queryFn: getMyStatistics,
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
      await queryClient.invalidateQueries({ queryKey: wishlistKeys.detail(wishlist.id) });
      await queryClient.invalidateQueries({ queryKey: statisticsKeys.all });
    },
  });
}

export function useWishlistById(wishlistId: string) {
  return useQuery({
    queryKey: wishlistKeys.detail(wishlistId),
    queryFn: () => getWishlistById(wishlistId),
    enabled: Boolean(wishlistId),
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
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
      await queryClient.invalidateQueries({
        queryKey: ["friends-without-wishlist-access", variables.wishlistId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["wishlist-access-list", variables.wishlistId],
      });
    },
  });
}

export function useRevokeWishlistAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ wishlistId, targetUserId }: { wishlistId: string; targetUserId: string }) =>
      revokeWishlistAccess(wishlistId, targetUserId),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["friends-without-wishlist-access", variables.wishlistId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["wishlist-access-list", variables.wishlistId],
      });
    },
  });
}
