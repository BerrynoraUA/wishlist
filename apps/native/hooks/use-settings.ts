import {
  changePassword,
  checkNicknameAvailable,
  deleteAccount,
  getAuthProvider,
  getExchangeRates,
  getProfile,
  getProfilesByIds,
  getSettings,
  updateProfile,
  updateSettings,
  uploadProfileAvatar,
} from "@/api/settings";
import { useAuth } from "@/providers/auth-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  UpdateProfilePayload,
  UpdateSettingsPayload,
  UserSettings,
} from "@wishlist/backend/types/settings";

export const settingsKeys = {
  all: ["settings"] as const,
  profile: (userId: string | null | undefined) =>
    [...settingsKeys.all, "profile", userId ?? "anonymous"] as const,
  preferences: (userId: string | null | undefined) =>
    [...settingsKeys.all, "preferences", userId ?? "anonymous"] as const,
  provider: (userId: string | null | undefined) =>
    [...settingsKeys.all, "provider", userId ?? "anonymous"] as const,
  exchangeRates: () => [...settingsKeys.all, "exchange-rates"] as const,
  profilesByIds: (idsKey: string) => [...settingsKeys.all, "profiles-by-ids", idsKey] as const,
};

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: settingsKeys.profile(user?.id),
    queryFn: getProfile,
    enabled: Boolean(user?.id),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.profile(user?.id) });
    },
  });
}

export function useUploadProfileAvatar() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: uploadProfileAvatar,
    onSuccess: (profile) => {
      queryClient.setQueryData(settingsKeys.profile(user?.id), profile);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.profile(user?.id) });
    },
  });
}

export function useCheckNickname() {
  return useMutation({
    mutationFn: (nickname: string) => checkNicknameAvailable(nickname),
  });
}

export function useProfilesByIds(userIds: string[]) {
  const idsKey = userIds.length ? [...userIds].sort().join("|") : "";

  return useQuery({
    queryKey: settingsKeys.profilesByIds(idsKey),
    queryFn: () => getProfilesByIds(userIds),
    enabled: userIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: settingsKeys.preferences(user?.id),
    queryFn: getSettings,
    enabled: Boolean(user?.id),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (payload: UpdateSettingsPayload) => updateSettings(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.preferences(user?.id) });

      const previousSettings = queryClient.getQueryData<UserSettings>(
        settingsKeys.preferences(user?.id),
      );

      if (previousSettings) {
        queryClient.setQueryData<UserSettings>(settingsKeys.preferences(user?.id), {
          ...previousSettings,
          ...payload,
        });
      }

      return { previousSettings };
    },
    onError: (_error, _payload, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(settingsKeys.preferences(user?.id), context.previousSettings);
      }
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsKeys.preferences(user?.id), settings);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: settingsKeys.preferences(user?.id),
        refetchType: "active",
      });
    },
  });
}

export function useAuthProvider() {
  const { user } = useAuth();

  return useQuery({
    queryKey: settingsKeys.provider(user?.id),
    queryFn: getAuthProvider,
    enabled: Boolean(user?.id),
    staleTime: Infinity,
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (newPassword: string) => changePassword(newPassword),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => deleteAccount(),
  });
}

export function useExchangeRates() {
  return useQuery({
    queryKey: settingsKeys.exchangeRates(),
    queryFn: getExchangeRates,
    staleTime: 60 * 60 * 1000,
  });
}
