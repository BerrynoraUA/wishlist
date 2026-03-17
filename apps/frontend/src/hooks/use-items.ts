import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWishlistItems,
  createItem,
  updateItem,
  deleteItem,
  toggleItemReservation,
} from "@/api/items";
import type { CreateItemParams, UpdateItemParams } from "@/api/types/item";
import { wishlistKeys } from "./use-wishlists";

// Query Keys
export const itemKeys = {
  all: ["items"] as const,
  wishlist: (wishlistId: string, params?: PaginationParams) =>
    [...itemKeys.all, "wishlist", wishlistId, params] as const,
};

// Queries
export function useWishlistItems(
  wishlistId: string,
  params?: PaginationParams,
) {
  return useQuery({
    queryKey: itemKeys.wishlist(wishlistId, params),
    queryFn: () => getWishlistItems(wishlistId, params),
    enabled: !!wishlistId,
  });
}

// Mutations
export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateItemParams) => createItem(params),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          Array.isArray(queryKey) &&
          queryKey[0] === itemKeys.all[0] &&
          queryKey[1] === "wishlist" &&
          queryKey[2] === data.wishlist_id,
      });
      queryClient.invalidateQueries({
        queryKey: wishlistKeys.my(),
      });
      queryClient.invalidateQueries({
        queryKey: wishlistKeys.detail(data.wishlist_id),
      });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateItemParams }) =>
      updateItem(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: wishlistKeys.my() });
    },
  });
}

export function useToggleItemReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => toggleItemReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemKeys.all });
      queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
      // Refresh friend/discover wishlists so reservation owner info updates
      queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          Array.isArray(queryKey) && queryKey[0] === wishlistKeys.all[0] &&
          (queryKey[1] === "friends" || queryKey[1] === "friend"),
      });
    },
  });
}

// Alias for legacy call sites still using the old name
export const useReserveItem = useToggleItemReservation;

