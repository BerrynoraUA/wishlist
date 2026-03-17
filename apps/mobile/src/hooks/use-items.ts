import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWishlistItems,
  createItem,
  updateItem,
  deleteItem,
  toggleItemReservation,
} from "@/api/items";
import type { CreateItemParams, UpdateItemParams } from "@/api/types/item";
import type { PaginationParams } from "@/types";
import { wishlistKeys } from "./use-wishlists";

export const itemKeys = {
  all: ["items"] as const,
  wishlist: (wishlistId: string, params?: PaginationParams) =>
    [...itemKeys.all, "wishlist", wishlistId, params] as const,
};

export function useWishlistItems(
  wishlistId: string,
  params?: PaginationParams
) {
  return useQuery({
    queryKey: itemKeys.wishlist(wishlistId, params),
    queryFn: () => getWishlistItems(wishlistId, params),
    enabled: !!wishlistId,
  });
}

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
      queryClient.invalidateQueries({ queryKey: wishlistKeys.my() });
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
    },
  });
}

export const useReserveItem = useToggleItemReservation;
