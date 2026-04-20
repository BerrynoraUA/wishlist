import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createSecretSantaEvent,
  deleteSecretSantaEvent,
  getSecretSantaDetails,
  listSecretSantaEvents,
  acceptSecretSantaInvite,
  declineSecretSantaInvite,
  joinSecretSantaEvent,
  removeSecretSantaParticipant,
  removeSecretSantaInvite,
  launchSecretSanta,
  getUserVisibleItemsByMaxPrice,
  updateSecretSantaEvent,
} from "@/api/secret-santa";
import type {
  CreateSecretSantaEventInput,
  LaunchSecretSantaInput,
  ListSecretSantaEventsParams,
  UpdateSecretSantaEventInput,
} from "@/api/types/secret-santa";
import { normalizeSearchQuery } from "@/lib/helpers/search";

export const secretSantaKeys = {
  all: ["secret-santa"] as const,
  lists: () => [...secretSantaKeys.all, "list"] as const,
  list: (params: ListSecretSantaEventsParams = {}) =>
    [...secretSantaKeys.lists(), params] as const,
  details: () => [...secretSantaKeys.all, "detail"] as const,
  detail: (eventId: string) => [...secretSantaKeys.details(), eventId] as const,
  giftSuggestions: (userId: string, maxPrice: number) =>
    [...secretSantaKeys.all, "gift-suggestions", userId, maxPrice] as const,
};

export function useSecretSantaEvents(params: ListSecretSantaEventsParams = {}) {
  const normalizedParams = {
    search: normalizeSearchQuery(params.search) || undefined,
    limit: params.limit,
    offset: params.offset,
  };

  return useQuery({
    queryKey: secretSantaKeys.list(normalizedParams),
    queryFn: () => listSecretSantaEvents(normalizedParams),
  });
}

export function useSecretSantaDetails(eventId?: string) {
  return useQuery({
    queryKey: secretSantaKeys.detail(eventId ?? ""),
    queryFn: () => getSecretSantaDetails(eventId!),
    enabled: !!eventId,
  });
}

export function useCreateSecretSantaEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSecretSantaEventInput) =>
      createSecretSantaEvent(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: secretSantaKeys.lists() });
      toast.success("Secret Santa event created");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create event");
    },
  });
}

export function useDeleteSecretSantaEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => deleteSecretSantaEvent(eventId),
    onSuccess: (_data, eventId) => {
      queryClient.invalidateQueries({ queryKey: secretSantaKeys.lists() });
      queryClient.removeQueries({ queryKey: secretSantaKeys.detail(eventId) });
      toast.success("Secret Santa event deleted");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete event");
    },
  });
}

export function useUpdateSecretSantaEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      updates,
    }: {
      eventId: string;
      updates: UpdateSecretSantaEventInput;
    }) => updateSecretSantaEvent(eventId, updates),
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({
        queryKey: secretSantaKeys.detail(eventId),
      });
      queryClient.invalidateQueries({ queryKey: secretSantaKeys.lists() });
      toast.success("Event updated");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update event");
    },
  });
}

export function useAcceptSecretSantaInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) => acceptSecretSantaInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: secretSantaKeys.all });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Invite accepted");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to accept invite");
    },
  });
}

export function useDeclineSecretSantaInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) => declineSecretSantaInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: secretSantaKeys.all });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Invite declined");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to decline invite");
    },
  });
}

export function useJoinSecretSantaEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => joinSecretSantaEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: secretSantaKeys.all });
      toast.success("Joined event");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to join event");
    },
  });
}

export function useRemoveSecretSantaParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, userId }: { eventId: string; userId: string }) =>
      removeSecretSantaParticipant(eventId, userId),
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({
        queryKey: secretSantaKeys.detail(eventId),
      });
      queryClient.invalidateQueries({ queryKey: secretSantaKeys.lists() });
      toast.success("Participant removed");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to remove participant");
    },
  });
}

export function useRemoveSecretSantaInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      inviteId,
    }: {
      eventId: string;
      inviteId: string;
    }) => removeSecretSantaInvite(inviteId),
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({
        queryKey: secretSantaKeys.detail(eventId),
      });
      queryClient.invalidateQueries({ queryKey: secretSantaKeys.lists() });
      toast.success("Invite removed");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to remove invite");
    },
  });
}

export function useLaunchSecretSanta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LaunchSecretSantaInput) => launchSecretSanta(input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: secretSantaKeys.detail(input.event_id),
      });
      queryClient.invalidateQueries({ queryKey: secretSantaKeys.lists() });
      toast.success("Secret Santa launched!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to launch Secret Santa");
    },
  });
}

export function useGiftSuggestions(userId?: string, maxPrice?: number) {
  return useQuery({
    queryKey: secretSantaKeys.giftSuggestions(userId ?? "", maxPrice ?? 0),
    queryFn: () => getUserVisibleItemsByMaxPrice(userId!, maxPrice!),
    enabled: !!userId && !!maxPrice,
  });
}
