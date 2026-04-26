import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
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
  grantWishlistAccess,
  getFriendsWishlistsPurchasedByMe,
  revokeWishlistAccess,
  getFriendsWishlistsDiscoverAll,
} from "@/api/wishlist";
import type {
  CreateWishlistParams,
  UpdateWishlistParams,
} from "@/api/types/wishilst";
import { normalizeSearchQuery } from "@/lib/helpers/search";

// Query Keys
export const wishlistKeys = {
  all: ["wishlists"] as const,
  my: (params?: PaginationParams) =>
    [...wishlistKeys.all, "my", params] as const,
  friends: (params?: PaginationParams) =>
    [...wishlistKeys.all, "friends", params] as const,
  friendsAll: (params?: PaginationParams) =>
    [...wishlistKeys.all, "friends", "all", params] as const,
  friendsReserved: (params?: PaginationParams) =>
    [...wishlistKeys.all, "friends", "reserved", params] as const,
  friendsPurchased: (params?: PaginationParams) =>
    [...wishlistKeys.all, "friends", "purchased", params] as const,
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

export function useMyWishlists(params?: PaginationParams) {
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

export function usePublicWishlists(params?: PaginationParams) {
  return useQuery({
    queryKey: wishlistKeys.friends(params),
    queryFn: () => getPublicWishlists(params),
  });
}

export function useFriendsWishlistsDiscover(
  params?: PaginationParams,
  enabled = true,
) {
  const normalizedParams = params
    ? {
        ...params,
        search: normalizeSearchQuery(params.search) || undefined,
      }
    : undefined;

  return useQuery({
    queryKey: wishlistKeys.friends(normalizedParams),
    queryFn: () => getFriendsWishlistsDiscover(normalizedParams),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useFriendsWishlistsDiscoverAll(
  params?: PaginationParams,
  enabled = true,
) {
  const normalizedParams = params
    ? {
        ...params,
        search: normalizeSearchQuery(params.search) || undefined,
      }
    : undefined;

  return useQuery({
    queryKey: wishlistKeys.friendsAll(normalizedParams),
    queryFn: () => getFriendsWishlistsDiscoverAll(normalizedParams),
    enabled,
    placeholderData: keepPreviousData,
  });
}
export function useFriendsWishlistsReservedByMe(
  params?: PaginationParams,
  enabled = true,
) {
  const normalizedParams = params
    ? {
        ...params,
        search: normalizeSearchQuery(params.search) || undefined,
      }
    : undefined;

  return useQuery({
    queryKey: wishlistKeys.friendsReserved(normalizedParams),
    queryFn: () => getFriendsWishlistsReservedByMe(normalizedParams),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useFriendsWishlistsPurchasedByMe(
  params?: PaginationParams,
  enabled = true,
) {
  const normalizedParams = params
    ? {
        ...params,
        search: normalizeSearchQuery(params.search) || undefined,
      }
    : undefined;

  return useQuery({
    queryKey: wishlistKeys.friendsPurchased(normalizedParams),
    queryFn: () => getFriendsWishlistsPurchasedByMe(normalizedParams),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useCreateWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateWishlistParams) => createWishlist(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
      toast.success("Wishlist created");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create wishlist");
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
      toast.success("Wishlist updated");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update wishlist");
    },
  });
}

export function useDeleteWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWishlist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
      toast.success("Wishlist deleted");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete wishlist");
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
  const normalizedQuery = normalizeSearchQuery(query);

  return useQuery({
    queryKey: [...wishlistKeys.all, "search", normalizedQuery] as const,
    queryFn: () => searchWishlists(normalizedQuery),
    enabled: Boolean(normalizedQuery),
  });
}

export function useFriendWishlists(userId: string, params?: PaginationParams) {
  return useQuery({
    queryKey: wishlistKeys.friend(userId, params),
    queryFn: () => getFriendWishlists(userId, params),
    enabled: !!userId,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
      queryClient.invalidateQueries({
        queryKey: ["friends-without-wishlist-access"],
      });
      queryClient.invalidateQueries({
        queryKey: ["wishlist-access-list"],
      });
      toast.success("Access granted");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to grant access");
    },
  });
}

export function useRevokeWishlistAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      wishlistId,
      targetUserId,
    }: {
      wishlistId: string;
      targetUserId: string;
    }) => revokeWishlistAccess(wishlistId, targetUserId),

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["wishlist-access-list", variables.wishlistId],
        exact: false,
      });

      queryClient.invalidateQueries({
        queryKey: ["friends-without-wishlist-access", variables.wishlistId],
        exact: false,
      });
      toast.success("Access revoked");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to revoke access");
    },
  });
}
