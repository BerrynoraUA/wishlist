import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  searchProfilesByNickname,
} from '@/api/friends';

// Query Keys
export const friendKeys = {
  all: ['friends'] as const,
  lists: () => [...friendKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...friendKeys.lists(), params] as const,
  requests: () => [...friendKeys.all, 'requests'] as const,
  incoming: (params?: PaginationParams) => [...friendKeys.requests(), 'incoming', params] as const,
  outgoing: (params?: PaginationParams) => [...friendKeys.requests(), 'outgoing', params] as const,
  check: (userId: string) => [...friendKeys.all, 'check', userId] as const,
  search: (query: string, params?: PaginationParams) => [...friendKeys.all, 'search', query, params] as const,
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
  return useQuery({
    queryKey: friendKeys.list(params),
    queryFn: () => getFriends(params),
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
  const trimmed = query?.trim() ?? '';

  return useQuery({
    queryKey: friendKeys.search(trimmed, params),
    queryFn: () => searchProfilesByNickname({
      query: trimmed,
      skip: params?.skip,
      take: params?.take,
    }),
    enabled: !!trimmed,
    staleTime: 30_000,
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
    },
  });
}

export function useRejectFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => rejectFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.incoming() });
    },
  });
}

export function useCancelFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => cancelFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.outgoing() });
    },
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (friendshipId: string) => removeFriend(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.lists() });
    },
  });
}
