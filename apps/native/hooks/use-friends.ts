import {
  acceptFriendRequest,
  blockUser,
  cancelFriendRequest,
  getBlockedUsers,
  checkFriendship,
  createFriendGroup,
  deleteFriendGroup,
  getFriendGroups,
  getFriendGroupMembers,
  getFriendGroupsWithoutWishlistAccess,
  getFriends,
  getFriendsWithoutWishlistAccess,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  getProfilesByIds,
  getWishlistAccessList,
  grantWishlistGroupAccess,
  rejectFriendRequest,
  removeFriend,
  revokeWishlistGroupAccess,
  searchProfilesByNickname,
  sendFriendRequest,
  unblockUser,
  updateFriendGroup,
} from "@/api/friends";
import { useSkipTakeInfiniteQuery } from "@/hooks/use-infinite-page";
import {
  friendKeys,
  type FriendPaginationParams as PaginationParams,
} from "@/lib/friend-query-keys";
import { wishlistKeys } from "@/lib/wishlist-query-keys";
import { normalizeSearchQuery } from "@/lib/wishlists";
import { useAuth } from "@/providers/auth-provider";
import type {
  FriendGroupPayload,
  GetFriendsWithoutWishlistAccessParams,
} from "@wishlist/backend/types/friends";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";

/** Lets a caller keep a query idle while the UI that needs it is not on screen. */
type QueryGate = { enabled?: boolean };
type WishlistAccessQueryParams = Pick<
  GetFriendsWithoutWishlistAccessParams,
  "wishlistId" | "search"
>;

export function useInfiniteIncomingFriendRequests(pageSize: number) {
  const { user } = useAuth();

  return useSkipTakeInfiniteQuery({
    queryKey: friendKeys.incoming(user?.id, { take: pageSize }),
    fetchPage: ({ skip, take }) =>
      getIncomingFriendRequests({
        skip,
        take,
      }),
    pageSize,
    enabled: Boolean(user?.id),
  });
}

export function useInfiniteOutgoingFriendRequests(pageSize: number) {
  const { user } = useAuth();

  return useSkipTakeInfiniteQuery({
    queryKey: friendKeys.outgoing(user?.id, { take: pageSize }),
    fetchPage: ({ skip, take }) =>
      getOutgoingFriendRequests({
        skip,
        take,
      }),
    pageSize,
    enabled: Boolean(user?.id),
  });
}

export function useCheckFriendship(userId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: friendKeys.check(user?.id, userId),
    queryFn: () => checkFriendship(userId),
    enabled: Boolean(user?.id && userId),
  });
}

export function useProfilesByIds(userIds: string[]) {
  const { user } = useAuth();
  const idsKey = userIds.length ? [...userIds].sort().join("|") : "";

  return useQuery({
    queryKey: friendKeys.profilesByIds(user?.id, idsKey),
    queryFn: () => getProfilesByIds(userIds),
    enabled: Boolean(user?.id) && userIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSearchProfilesByNickname(query: string, params?: PaginationParams) {
  const { user } = useAuth();
  const normalizedQuery = normalizeSearchQuery(query);
  const stableParams = React.useMemo(
    () => (params ? { skip: params.skip, take: params.take } : undefined),
    [params?.skip, params?.take],
  );

  return useQuery({
    queryKey: friendKeys.search(user?.id, normalizedQuery, stableParams),
    queryFn: () =>
      searchProfilesByNickname({
        query: normalizedQuery,
        skip: stableParams?.skip,
        take: stableParams?.take,
      }),
    enabled: Boolean(user?.id) && normalizedQuery.length >= 3,
    staleTime: 30_000,
  });
}

export function useInfiniteFriends(
  params: PaginationParams,
  pageSize: number,
  { enabled = true }: QueryGate = {},
) {
  const { user } = useAuth();
  const normalizedParams = React.useMemo(
    () => ({
      search: normalizeSearchQuery(params.search) || undefined,
    }),
    [params.search],
  );

  return useSkipTakeInfiniteQuery({
    queryKey: friendKeys.list(user?.id, { ...normalizedParams, take: pageSize }),
    fetchPage: ({ skip, take }) =>
      getFriends({
        ...normalizedParams,
        skip,
        take,
      }),
    pageSize,
    enabled: enabled && Boolean(user?.id),
  });
}

export function useInfiniteFriendGroups(
  params: PaginationParams,
  pageSize: number,
  { enabled = true }: QueryGate = {},
) {
  const { user } = useAuth();
  const normalizedParams = React.useMemo(
    () => ({
      search: normalizeSearchQuery(params.search) || undefined,
    }),
    [params.search],
  );

  return useSkipTakeInfiniteQuery({
    queryKey: friendKeys.groupList(user?.id, {
      ...normalizedParams,
      take: pageSize,
    }),
    fetchPage: ({ skip, take }) =>
      getFriendGroups({
        ...normalizedParams,
        skip,
        take,
      }),
    pageSize,
    enabled: enabled && Boolean(user?.id),
  });
}

export function useFriendGroupMembers(groupId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: friendKeys.groupMembers(user?.id, groupId),
    queryFn: () => getFriendGroupMembers(groupId!),
    enabled: Boolean(user?.id && groupId),
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (receiverId: string) => sendFriendRequest(receiverId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: friendKeys.all });
    },
  });
}

export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => acceptFriendRequest(requestId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: friendKeys.requests() });
      await queryClient.invalidateQueries({ queryKey: friendKeys.lists() });
    },
  });
}

export function useRejectFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => rejectFriendRequest(requestId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: friendKeys.requests() });
    },
  });
}

export function useCancelFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => cancelFriendRequest(requestId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: friendKeys.requests() });
    },
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (friendId: string) => removeFriend(friendId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: friendKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
    },
  });
}

export function useBlockedUsers(params?: PaginationParams) {
  const { user } = useAuth();
  const normalized = params
    ? { ...params, search: normalizeSearchQuery(params.search) || undefined }
    : undefined;

  return useQuery({
    queryKey: friendKeys.blocked(user?.id, normalized),
    queryFn: () => getBlockedUsers(normalized),
    enabled: Boolean(user?.id),
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => blockUser(userId),
    onSuccess: async () => {
      // The block drops the friendship and any pending request, so every
      // friends list can be stale afterwards.
      await queryClient.invalidateQueries({ queryKey: friendKeys.all });
      await queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => unblockUser(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: friendKeys.all });
      await queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
    },
  });
}

export function useCreateFriendGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: FriendGroupPayload) => createFriendGroup(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: friendKeys.groups() });
    },
  });
}

export function useUpdateFriendGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, payload }: { groupId: string; payload: FriendGroupPayload }) =>
      updateFriendGroup(groupId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: friendKeys.groups() });
      await queryClient.invalidateQueries({ queryKey: friendKeys.groupMembersRoot() });
    },
  });
}

export function useDeleteFriendGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => deleteFriendGroup(groupId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: friendKeys.groups() });
      await queryClient.invalidateQueries({ queryKey: ["wishlist-access-list"] });
    },
  });
}

export function useInfiniteFriendsWithoutWishlistAccess(
  params: WishlistAccessQueryParams,
  pageSize: number,
  { enabled = true }: QueryGate = {},
) {
  const { user } = useAuth();
  const { wishlistId, search } = params;
  const normalizedSearch = normalizeSearchQuery(search) || undefined;

  return useSkipTakeInfiniteQuery({
    queryKey: friendKeys.friendsWithoutWishlistAccess(user?.id, wishlistId, {
      search: normalizedSearch,
      take: pageSize,
    }),
    fetchPage: ({ skip, take }) =>
      getFriendsWithoutWishlistAccess({
        wishlistId,
        search: normalizedSearch,
        skip,
        take,
      }),
    pageSize,
    enabled: enabled && Boolean(user?.id && wishlistId),
  });
}

export function useInfiniteFriendGroupsWithoutWishlistAccess(
  params: WishlistAccessQueryParams,
  pageSize: number,
  { enabled = true }: QueryGate = {},
) {
  const { user } = useAuth();
  const { wishlistId, search } = params;
  const normalizedSearch = normalizeSearchQuery(search) || undefined;

  return useSkipTakeInfiniteQuery({
    queryKey: friendKeys.groupsWithoutWishlistAccess(user?.id, wishlistId, {
      search: normalizedSearch,
      take: pageSize,
    }),
    fetchPage: ({ skip, take }) =>
      getFriendGroupsWithoutWishlistAccess({
        wishlistId,
        search: normalizedSearch,
        skip,
        take,
      }),
    pageSize,
    enabled: enabled && Boolean(user?.id && wishlistId),
  });
}

export function useWishlistAccessList(wishlistId?: string, { enabled = true }: QueryGate = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wishlist-access-list", user?.id ?? "anonymous", wishlistId],
    queryFn: () => getWishlistAccessList(wishlistId!),
    enabled: enabled && Boolean(user?.id && wishlistId),
  });
}

export function useGrantWishlistGroupAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ wishlistId, groupId }: { wishlistId: string; groupId: string }) =>
      grantWishlistGroupAccess(wishlistId, groupId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
      await queryClient.invalidateQueries({
        queryKey: ["wishlist-access-list"],
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: friendKeys.withoutWishlistAccess(),
      });
    },
  });
}

export function useRevokeWishlistGroupAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ wishlistId, groupId }: { wishlistId: string; groupId: string }) =>
      revokeWishlistGroupAccess(wishlistId, groupId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: wishlistKeys.all });
      await queryClient.invalidateQueries({
        queryKey: ["wishlist-access-list"],
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: friendKeys.withoutWishlistAccess(),
      });
    },
  });
}
