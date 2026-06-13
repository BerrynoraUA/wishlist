import {
  acceptFriendRequest,
  cancelFriendRequest,
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
  updateFriendGroup,
} from "@/api/friends";
import { normalizeSearchQuery } from "@/lib/wishlists";
import { useAuth } from "@/providers/auth-provider";
import type {
  FriendGroupPayload,
  GetFriendsWithoutWishlistAccessParams,
} from "@wishlist/backend/types/friends";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { wishlistKeys } from "./use-wishlists";

type PaginationParams = {
  skip?: number;
  take?: number;
  search?: string;
};

export const friendKeys = {
  all: ["friends"] as const,
  lists: () => [...friendKeys.all, "list"] as const,
  list: (authUserId: string | null | undefined, params?: PaginationParams) =>
    [...friendKeys.lists(), authUserId ?? "anonymous", params] as const,
  requests: () => [...friendKeys.all, "requests"] as const,
  incoming: (authUserId: string | null | undefined, params?: PaginationParams) =>
    [...friendKeys.requests(), "incoming", authUserId ?? "anonymous", params] as const,
  outgoing: (authUserId: string | null | undefined, params?: PaginationParams) =>
    [...friendKeys.requests(), "outgoing", authUserId ?? "anonymous", params] as const,
  search: (authUserId: string | null | undefined, query: string, params?: PaginationParams) =>
    [...friendKeys.all, "search", authUserId ?? "anonymous", query, params] as const,
  groups: () => [...friendKeys.all, "groups"] as const,
  groupList: (authUserId: string | null | undefined, params?: PaginationParams) =>
    [...friendKeys.groups(), authUserId ?? "anonymous", params] as const,
  groupMembers: (authUserId: string | null | undefined, groupId?: string) =>
    [...friendKeys.groups(), "members", authUserId ?? "anonymous", groupId] as const,
  groupMembersRoot: () => [...friendKeys.groups(), "members"] as const,
  check: (authUserId: string | null | undefined, userId: string) =>
    [...friendKeys.all, "check", authUserId ?? "anonymous", userId] as const,
  profilesByIds: (authUserId: string | null | undefined, idsKey: string) =>
    [...friendKeys.all, "profiles-by-ids", authUserId ?? "anonymous", idsKey] as const,
};

export function useIncomingFriendRequests(params?: PaginationParams) {
  const { user } = useAuth();

  return useQuery({
    queryKey: friendKeys.incoming(user?.id, params),
    queryFn: () => getIncomingFriendRequests(params),
    enabled: Boolean(user?.id),
  });
}

export function useOutgoingFriendRequests(params?: PaginationParams) {
  const { user } = useAuth();

  return useQuery({
    queryKey: friendKeys.outgoing(user?.id, params),
    queryFn: () => getOutgoingFriendRequests(params),
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

export function useFriends(params?: PaginationParams) {
  const { user } = useAuth();
  const normalizedParams = React.useMemo(
    () =>
      params
        ? {
            skip: params.skip,
            take: params.take,
            search: normalizeSearchQuery(params.search) || undefined,
          }
        : undefined,
    [params?.search, params?.skip, params?.take],
  );

  return useQuery({
    queryKey: friendKeys.list(user?.id, normalizedParams),
    queryFn: () => getFriends(normalizedParams),
    enabled: Boolean(user?.id),
  });
}

export function useFriendGroups(params?: PaginationParams) {
  const { user } = useAuth();
  const normalizedParams = React.useMemo(
    () =>
      params
        ? {
            skip: params.skip,
            take: params.take,
            search: normalizeSearchQuery(params.search) || undefined,
          }
        : undefined,
    [params?.search, params?.skip, params?.take],
  );

  return useQuery({
    queryKey: friendKeys.groupList(user?.id, normalizedParams),
    queryFn: () => getFriendGroups(normalizedParams),
    enabled: Boolean(user?.id),
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
    onSuccess: async (_data, variables) => {
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

export function useFriendsWithoutWishlistAccess(params: GetFriendsWithoutWishlistAccessParams) {
  const { user } = useAuth();
  const { wishlistId, search, skip = 0, take = 20 } = params;
  const normalizedSearch = normalizeSearchQuery(search) || undefined;

  return useQuery({
    queryKey: [
      "friends-without-wishlist-access",
      user?.id ?? "anonymous",
      wishlistId,
      normalizedSearch ?? "",
      skip,
      take,
    ],
    queryFn: () =>
      getFriendsWithoutWishlistAccess({
        wishlistId,
        search: normalizedSearch,
        skip,
        take,
      }),
    enabled: Boolean(user?.id && wishlistId),
  });
}

export function useFriendGroupsWithoutWishlistAccess(
  params: GetFriendsWithoutWishlistAccessParams,
) {
  const { user } = useAuth();
  const { wishlistId, search, skip = 0, take = 20 } = params;
  const normalizedSearch = normalizeSearchQuery(search) || undefined;

  return useQuery({
    queryKey: [
      "friend-groups-without-wishlist-access",
      user?.id ?? "anonymous",
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
    enabled: Boolean(user?.id && wishlistId),
  });
}

export function useWishlistAccessList(wishlistId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wishlist-access-list", user?.id ?? "anonymous", wishlistId],
    queryFn: () => getWishlistAccessList(wishlistId!),
    enabled: Boolean(user?.id && wishlistId),
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
        queryKey: ["wishlist-access-list"],
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: ["friend-groups-without-wishlist-access"],
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
        queryKey: ["wishlist-access-list"],
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: ["friend-groups-without-wishlist-access"],
        exact: false,
      });
    },
  });
}
