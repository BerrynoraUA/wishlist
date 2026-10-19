import { useQueuedWrite } from "@/hooks/use-queued-write";
import { findLocalRecord } from "@/lib/local-write-cache";
import { newRecordId } from "@/lib/record-id";
import { keepImageForSync } from "@/lib/offline-images";
import type { SecretSantaDetails, SecretSantaEvent } from "@wishlist/backend/types/secret-santa";
import type { UserProfile } from "@wishlist/backend/types/settings";
import { hapticError, hapticSuccess } from "@/lib/haptics";
import {
  acceptSecretSantaInvite,
  declineSecretSantaInvite,
  getSecretSantaDetails,
  getUserVisibleItemsByMaxPrice,
  inviteSecretSantaUsers,
  joinSecretSantaEvent,
  launchSecretSanta,
  listSecretSantaEvents,
  removeSecretSantaInvite,
  removeSecretSantaParticipant,
} from "@/api/secret-santa";
import { notificationKeys } from "@/hooks/use-notifications";
import { settingsKeys } from "@/hooks/use-settings";
import { normalizeSearchQuery } from "@/lib/wishlists";
import { useAuth } from "@/providers/auth-provider";
import type {
  CreateSecretSantaEventInput,
  LaunchSecretSantaInput,
  ListSecretSantaEventsParams,
  UpdateSecretSantaEventInput,
} from "@wishlist/backend/types/secret-santa";
import {
  infiniteQueryOptions,
  queryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

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

export function secretSantaEventsQueryOptions(
  authUserId: string | undefined,
  params: ListSecretSantaEventsParams,
  pageSize: number,
) {
  const normalizedParams = {
    search: normalizeSearchQuery(params.search) || undefined,
  };

  return infiniteQueryOptions({
    queryKey: secretSantaKeys.list(authUserId, { ...normalizedParams, limit: pageSize }),
    queryFn: ({ pageParam }) =>
      listSecretSantaEvents({
        ...normalizedParams,
        limit: pageSize,
        offset: pageParam * pageSize,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.offset + lastPage.items.length < lastPage.total ? lastPageParam + 1 : undefined,
  });
}

export function useInfiniteSecretSantaEvents(
  params: ListSecretSantaEventsParams,
  pageSize: number,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const { user } = useAuth();

  return useInfiniteQuery({
    ...secretSantaEventsQueryOptions(user?.id, params, pageSize),
    enabled: enabled && Boolean(user?.id),
  });
}

export function secretSantaDetailsQueryOptions(authUserId: string | undefined, eventId: string) {
  return queryOptions({
    queryKey: secretSantaKeys.detail(authUserId, eventId),
    queryFn: () => getSecretSantaDetails(eventId),
  });
}

export function useSecretSantaDetails(eventId?: string) {
  const { user } = useAuth();

  return useQuery({
    ...secretSantaDetailsQueryOptions(user?.id, eventId ?? ""),
    enabled: Boolean(user?.id && eventId),
  });
}

async function eventPayload<T extends CreateSecretSantaEventInput | UpdateSecretSantaEventInput>(
  input: T,
) {
  const { image, ...payload } = input;
  if (image && "uri" in image) {
    const saved = await keepImageForSync(image);
    return { ...payload, imageUrl: saved.uri };
  }
  return payload;
}

export function useCreateSecretSantaEvent() {
  return useQueuedWrite(async (input: CreateSecretSantaEventInput, userId, client) => {
    const id = newRecordId();
    const payload = await eventPayload(input);
    // The server makes the creator the first participant; show them the same way until then.
    const profile = client.getQueryData<UserProfile>(settingsKeys.profile(userId));
    const local: SecretSantaDetails & { is_owner: boolean; participants_count: number } = {
      id,
      name: input.name,
      event_date: input.event_date,
      budget: input.budget,
      currency: input.currency,
      image_url: payload.imageUrl ?? null,
      owner_id: userId,
      is_owner: true,
      participants_count: 1,
      is_started: false,
      participants: [
        {
          id: userId,
          nickname: profile?.nickname ?? null,
          display_name: profile?.display_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
        },
      ],
      pending_invites: [],
      my_receiver: null,
    };
    return { entity: "event", action: "create", id, userId, payload, local };
  });
}

export function useUpdateSecretSantaEvent() {
  return useQueuedWrite(
    async (
      { eventId: id, updates }: { eventId: string; updates: UpdateSecretSantaEventInput },
      userId,
      client,
    ) => {
      const payload = await eventPayload(updates);
      const previous = findLocalRecord<SecretSantaEvent>(client, "event", id);
      if (!previous) throw new Error("Open this event while connected before editing it offline.");
      const local = {
        ...previous,
        ...payload,
        ...(payload.imageUrl !== undefined && { image_url: payload.imageUrl }),
        ...(updates.removeImage && { image_url: null }),
      };
      return { entity: "event", action: "update", id, userId, payload, local };
    },
  );
}

export function useDeleteSecretSantaEvent() {
  return useQueuedWrite((id: string, userId) => ({
    entity: "event",
    action: "delete",
    id,
    userId,
    payload: {},
    local: undefined,
  }));
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
      hapticSuccess();
      await queryClient.invalidateQueries({ queryKey: secretSantaKeys.all });
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: hapticError,
  });
}

export function useDeclineSecretSantaInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) => declineSecretSantaInvite(inviteId),
    onSuccess: async () => {
      hapticSuccess();
      await queryClient.invalidateQueries({ queryKey: secretSantaKeys.all });
      await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: hapticError,
  });
}

export function useJoinSecretSantaEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => joinSecretSantaEvent(eventId),
    onSuccess: async () => {
      hapticSuccess();
      await queryClient.invalidateQueries({ queryKey: secretSantaKeys.all });
    },
    onError: hapticError,
  });
}

export function useRemoveSecretSantaParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, userId }: { eventId: string; userId: string }) =>
      removeSecretSantaParticipant(eventId, userId),
    onSuccess: async () => {
      hapticSuccess();
      await queryClient.invalidateQueries({ queryKey: secretSantaKeys.all });
    },
    onError: hapticError,
  });
}

export function useRemoveSecretSantaInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { eventId: string; inviteId: string }) =>
      removeSecretSantaInvite(payload.inviteId),
    onSuccess: async () => {
      hapticSuccess();
      await queryClient.invalidateQueries({ queryKey: secretSantaKeys.all });
    },
    onError: hapticError,
  });
}

export function useLaunchSecretSanta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LaunchSecretSantaInput) => launchSecretSanta(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: secretSantaKeys.all });
    },
    onError: hapticError,
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
