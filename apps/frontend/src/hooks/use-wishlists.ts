import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyWishlists,
  getPublicWishlists,
  createWishlist,
  updateWishlist,
  deleteWishlist,
  getFriendsWishlistsDiscover,
  getWishlistById,
  getFriendsUpcomingWishlists,
  searchWishlists,
  getFriendWishlists,
  getFriendsWishlistsReservedByMe,
} from "@/api/wishlist";
import type {
  CreateWishlistParams,
  UpdateWishlistParams,
} from "@/api/types/wishilst";

// Query Keys
export const wishlistKeys = {
  all: ["wishlists"] as const,
  my: (params?: PaginationParams) =>
    [...wishlistKeys.all, "my", params] as const,
  friends: (params?: PaginationParams) =>
    [...wishlistKeys.all, "friends", params] as const,
  friendsReserved: (params?: PaginationParams) =>
    [...wishlistKeys.all, "friends", "reserved", params] as const,
  friend: (userId: string, params?: PaginationParams) =>
    [...wishlistKeys.all, "friend", userId, params] as const,
  detail: (id: string) => [...wishlistKeys.all, "detail", id] as const,
  friendsUpcoming: ["wishlists", "friends", "upcoming"] as const,
};

export function useFriendsUpcomingWishlists() {
  return useQuery({
    queryKey: wishlistKeys.friendsUpcoming,
    queryFn: () => getFriendsUpcomingWishlists(),
  });
}
// Queries
export function useMyWishlists(params?: PaginationParams) {
  return useQuery({
    queryKey: wishlistKeys.my(params),
    queryFn: () => getMyWishlists(params),
  });
}

export function usePublicWishlists(params?: PaginationParams) {
  return useQuery({
    queryKey: wishlistKeys.friends(params),
    queryFn: () => getPublicWishlists(params),
  });
}

export function useFriendsWishlistsDiscover(params?: PaginationParams) {
  return useQuery({
    queryKey: wishlistKeys.friends(params),
    queryFn: () => getFriendsWishlistsDiscover(params),
  });
}

export function useFriendsWishlistsReservedByMe(params?: PaginationParams) {
  return useQuery({
    queryKey: wishlistKeys.friendsReserved(params),
    queryFn: () => getFriendsWishlistsReservedByMe(params),
  });
}

export function useCreateWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateWishlistParams) => createWishlist(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
    },
  });
}

export function useUpdateWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateWishlistParams;
    }) => updateWishlist(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
    },
  });
}

export function useDeleteWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWishlist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
    },
  });
}

export function useWishlistById(wishlistId: string) {
  return useQuery({
    queryKey: wishlistKeys.detail(wishlistId),
    queryFn: () => getWishlistById(wishlistId),
    enabled: !!wishlistId,
  });
}

export function useSearchWishlists(query: string) {
  return useQuery({
    queryKey: [...wishlistKeys.all, "search", query] as const,
    queryFn: () => searchWishlists(query),
    enabled: query.trim().length > 0,
  });
}

export function useFriendWishlists(userId: string, params?: PaginationParams) {
  return useQuery({
    queryKey: wishlistKeys.friend(userId, params),
    queryFn: () => getFriendWishlists(userId, params),
    enabled: !!userId,
  });
}
