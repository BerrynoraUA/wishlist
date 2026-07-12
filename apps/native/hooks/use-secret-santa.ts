import {
  acceptSecretSantaInvite,
  createSecretSantaEvent,
  declineSecretSantaInvite,
  deleteSecretSantaEvent,
  getSecretSantaDetails,
  getUserVisibleItemsByMaxPrice,
  inviteSecretSantaUsers,
  joinSecretSantaEvent,
  launchSecretSanta,
  listSecretSantaEvents,
  removeSecretSantaInvite,
  removeSecretSantaParticipant,
  updateSecretSantaEvent,
} from "@/api/secret-santa";
import { notificationKeys } from "@/hooks/use-notifications";
import { normalizeSearchQuery } from "@/lib/wishlists";
import { useAuth } from "@/providers/auth-provider";
import type {
  CreateSecretSantaEventInput,
  LaunchSecretSantaInput,
  ListSecretSantaEventsParams,
  UpdateSecretSantaEventInput,
} from "@wishlist/backend/types/secret-santa";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const secretSantaKeys = {
  all: ["secret-santa"] as const,
  lists: () => [...secretSantaKeys.all, "list"] as const,
  list: (authUserId: string | null | undefined, params: ListSecretSantaEventsParams = {}) =>
    [...secretSantaKeys.lists(), authUserId ?? "anonymous", params] as const,
  details: () => [...secretSantaKeys.all, "detail"] as const,
  detail: (authUserId: string | null | undefined, eventId: string) =>
    [...secretSantaKeys.details(), authUserId ?? "anonymous", eventId] as const,
  giftSuggestions: (authUserId: string | null | undefined, userId: string, maxPrice: number) => [
    ...secretSantaKeys.all,
    "gift-suggestions",
    authUserId ?? "anonymous",
    userId,
    maxPrice,
  ],
};

export function useInfiniteSecretSantaEvents(
  params: ListSecretSantaEventsParams,
  pageSize: number,
) {
  const { user } = useAuth();
  const normalizedParams = {
    search: normalizeSearchQuery(params.search) || undefined,
  };

  return useInfiniteQuery({
    queryKey: secretSantaKeys.list(user?.id, { ...normalizedParams, limit: pageSize }),
    queryFn: ({ pageParam }) =>
      listSecretSantaEvents({
        ...normalizedParams,
        limit: pageSize,
        offset: pageParam * pageSize,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.offset + lastPage.items.length < lastPage.total ? lastPageParam + 1 : undefined,
    enabled: Boolean(user?.id),
  });
}

export function useSecretSantaDetails(eventId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: secretSantaKeys.detail(user?.id, eventId ?? ""),
    queryFn: () => getSecretSantaDetails(eventId!),
    enabled: Boolean(user?.id && eventId),
  });
}

export function useCreateSecretSantaEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSecretSantaEventInput) => createSecretSantaEvent(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: secretSantaKeys.lists() });
    },
  });
}

export function useUpdateSecretSantaEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, updates }: { eventId: string; updates: UpdateSecretSantaEventInput }) =>
      updateSecretSantaEvent(eventId, updates),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: secretSantaKeys.all });
    },
  });
}

export function useDeleteSecretSantaEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => deleteSecretSantaEvent(eventId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: secretSantaKeys.lists() });
      queryClient.removeQueries({ queryKey: ["secret-santa", "detail"], exact: false });
    },
  });
}

export function useInviteSecretSantaUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      eventName,
      userIds,
    }: {
      eventId: string;
      eventName: string;
      userIds: string[];
    }) => inviteSecretSantaUsers(eventId, eventName, userIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: secretSantaKeys.all });
    },
  });
}

export function useAcceptSecretSantaInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) => acceptSecretSantaInvite(inviteId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: secretSantaKeys.all });
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDeclineSecretSantaInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) => declineSecretSantaInvite(inviteId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: secretSantaKeys.all });
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useJoinSecretSantaEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => joinSecretSantaEvent(eventId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: secretSantaKeys.all });
    },
  });
}

export function useRemoveSecretSantaParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, userId }: { eventId: string; userId: string }) =>
      removeSecretSantaParticipant(eventId, userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: secretSantaKeys.all });
    },
  });
}

export function useRemoveSecretSantaInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { eventId: string; inviteId: string }) =>
      removeSecretSantaInvite(payload.inviteId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: secretSantaKeys.all });
    },
  });
}

export function useLaunchSecretSanta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LaunchSecretSantaInput) => launchSecretSanta(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: secretSantaKeys.all });
    },
  });
}

export function useGiftSuggestions(userId?: string, maxPrice?: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: secretSantaKeys.giftSuggestions(user?.id, userId ?? "", maxPrice ?? 0),
    queryFn: () => getUserVisibleItemsByMaxPrice(userId!, maxPrice!),
    enabled: Boolean(user?.id && userId && maxPrice),
  });
}
