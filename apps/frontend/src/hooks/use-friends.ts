import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  getFriends,
  checkFriendship,
  removeFriend,
  blockUser,
  unblockUser,
  getBlockedUsers,
  searchProfilesByNickname,
  getFriendsWithoutWishlistAccess,
  getWishlistAccessList,
  getFriendGroups,
  getFriendGroupMembers,
  createFriendGroup,
  updateFriendGroup,
  deleteFriendGroup,
  getFriendGroupsWithoutWishlistAccess,
  grantWishlistGroupAccess,
  revokeWishlistGroupAccess,
} from "@/api/friends";
import { FriendGroupPayload, GetFriendsWithoutWishlistAccessParams } from "@/api/types/friends";
import { normalizeSearchQuery } from "@/lib/helpers/search";

// Query Keys
export const friendKeys = {
  all: ["friends"] as const,
  lists: () => [...friendKeys.all, "list"] as const,
  list: (params?: PaginationParams) => [...friendKeys.lists(), params] as const,
  requests: () => [...friendKeys.all, "requests"] as const,
  incoming: (params?: PaginationParams) => [...friendKeys.requests(), "incoming", params] as const,
  outgoing: (params?: PaginationParams) => [...friendKeys.requests(), "outgoing", params] as const,
  check: (userId: string) => [...friendKeys.all, "check", userId] as const,
  search: (query: string, params?: PaginationParams) =>
    [...friendKeys.all, "search", query, params] as const,
  groups: () => [...friendKeys.all, "groups"] as const,
  blocked: (params?: PaginationParams) => [...friendKeys.all, "blocked", params] as const,
  groupList: (params?: PaginationParams) => [...friendKeys.groups(), params] as const,
  groupMembers: (groupId?: string) => [...friendKeys.groups(), "members", groupId] as const,
};

// ============= QUERIES =============

export function useIncomingFriendRequests(params?: PaginationParams) {
  return useQuery({
    queryKey: friendKeys.incoming(params),
    queryFn: () => getIncomingFriendRequests(params),
  });
}

export function useOutgoingFriendRequests(params?: PaginationParams) {
  return useQuery({
    queryKey: friendKeys.outgoing(params),
    queryFn: () => getOutgoingFriendRequests(params),
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

export function useCheckFriendship(userId: string) {
  return useQuery({
    queryKey: friendKeys.check(userId),
    queryFn: () => checkFriendship(userId),
    enabled: !!userId,
  });
}

export function useSearchProfilesByNickname(query: string, params?: PaginationParams) {
  const trimmed = normalizeSearchQuery(query);

  return useQuery({
    queryKey: friendKeys.search(trimmed, params),
    queryFn: () =>
      searchProfilesByNickname({
        query: trimmed,
        skip: params?.skip,
        take: params?.take,
      }),
    enabled: !!trimmed,
    staleTime: 30_000,
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

export function useFriendGroupMembers(groupId?: string) {
  return useQuery({
    queryKey: friendKeys.groupMembers(groupId),
    queryFn: () => getFriendGroupMembers(groupId!),
    enabled: Boolean(groupId),
  });
}

// ============= MUTATIONS =============

export function useSendFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (receiverId: string) => sendFriendRequest(receiverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.all });
      queryClient.invalidateQueries({ queryKey: friendKeys.outgoing() });
      queryClient.invalidateQueries({ queryKey: friendKeys.lists() });
      toast.success("Friend request sent");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send friend request");
    },
  });
}

export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => acceptFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.incoming() });
      queryClient.invalidateQueries({ queryKey: friendKeys.lists() });
      toast.success("Friend request accepted");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to accept friend request");
    },
  });
}

export function useRejectFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => rejectFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.incoming() });
      toast.success("Friend request declined");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to decline friend request");
    },
  });
}

export function useCancelFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => cancelFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.outgoing() });
      toast.success("Friend request cancelled");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to cancel friend request");
    },
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (friendshipId: string) => removeFriend(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.lists() });
      toast.success("Friend removed");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to remove friend");
    },
  });
}

export function useBlockedUsers(params?: PaginationParams) {
  const normalized = params
    ? { ...params, search: normalizeSearchQuery(params.search ?? "") || undefined }
    : undefined;

  return useQuery({
    queryKey: friendKeys.blocked(normalized),
    queryFn: () => getBlockedUsers(normalized),
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => blockUser(userId),
    onSuccess: () => {
      // The block drops the friendship and any pending request, so every
      // friends list can be stale afterwards.
      queryClient.invalidateQueries({ queryKey: friendKeys.all });
      toast.success("User blocked");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to block user");
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => unblockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.all });
      toast.success("User unblocked");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to unblock user");
    },
  });
}

export function useCreateFriendGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: FriendGroupPayload) => createFriendGroup(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.groups() });
      toast.success("Group created");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create group");
    },
  });
}

export function useUpdateFriendGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, payload }: { groupId: string; payload: FriendGroupPayload }) =>
      updateFriendGroup(groupId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: friendKeys.groups() });
      queryClient.invalidateQueries({
        queryKey: friendKeys.groupMembers(variables.groupId),
      });
      toast.success("Group updated");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update group");
    },
  });
}

export function useDeleteFriendGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => deleteFriendGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.groups() });
      queryClient.invalidateQueries({ queryKey: ["wishlist-access-list"] });
      toast.success("Group deleted");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete group");
    },
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

export function useWishlistAccessList(wishlistId?: string) {
  return useQuery({
    queryKey: ["wishlist-access-list", wishlistId],
    queryFn: () => getWishlistAccessList(wishlistId!),
    enabled: !!wishlistId,
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

export function useGrantWishlistGroupAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ wishlistId, groupId }: { wishlistId: string; groupId: string }) =>
      grantWishlistGroupAccess(wishlistId, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist-access-list"] });
      queryClient.invalidateQueries({
        queryKey: ["friend-groups-without-wishlist-access"],
      });
    },
  });
}

export function useRevokeWishlistGroupAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ wishlistId, groupId }: { wishlistId: string; groupId: string }) =>
      revokeWishlistGroupAccess(wishlistId, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist-access-list"] });
      queryClient.invalidateQueries({
        queryKey: ["friend-groups-without-wishlist-access"],
      });
    },
  });
}
