import {
  createWishlist,
  deleteWishlist,
  getMyStatistics,
  getMyWishlists,
  updateWishlist,
} from "@/api/wishlists";
import { normalizeSearchQuery } from "@/lib/wishlists";
import type { WishlistFormValues, WishlistQueryParams } from "@/types/wishlist";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const wishlistKeys = {
  all: ["wishlists"] as const,
  my: (params?: WishlistQueryParams) => [...wishlistKeys.all, "my", params] as const,
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
