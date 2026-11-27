import { useQueuedWrite } from "@/hooks/use-queued-write";

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
} from "@/api/settings";
import { applyNativeThemeSettings, writeCachedNativeThemeSettings } from "@/lib/theme";
import { useAuth } from "@/providers/auth-provider";
import { getRandomDefaultAvatarUrl } from "@wishlist/backend/lib/default-avatars";
import * as React from "react";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DEFAULT_SETTINGS,
  type UpdateProfilePayload,
  type UpdateSettingsPayload,
  type UserProfile,
  type UserSettings,
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

/**
 * Gives a profile with no picture one of the ten default avatars — the same write the
 * picker makes when a default is chosen by hand. The app does this rather than the
 * database because building the URL needs the project's storage host, which Postgres
 * has no way to know.
 */
export function useEnsureDefaultAvatar() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const assignedRef = React.useRef(false);

  React.useEffect(() => {
    if (!profile || profile.avatar_url || assignedRef.current) return;

    assignedRef.current = true;
    updateProfile.mutate(
      { avatar_url: getRandomDefaultAvatarUrl() },
      // A failed write (offline, usually) should be retried on the next launch.
      { onError: () => (assignedRef.current = false) },
    );
  }, [profile?.avatar_url, profile?.id]);
}

export function useUpdateProfile() {
  return useQueuedWrite((payload: UpdateProfilePayload, userId, client) => {
    const previous = client.getQueryData<UserProfile>(settingsKeys.profile(userId));
    if (!previous) throw new Error("Load your profile while connected before editing it offline.");
    return {
      entity: "profile",
      action: "update",
      id: userId,
      userId,
      payload,
      local: { ...previous, ...payload },
    };
  });
}

export function useUpdateUserGuideStep() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const profileKey = settingsKeys.profile(user?.id);

  return useMutation({
    mutationFn: (step: number) => updateProfile({ userGuideStep: step }),
    // Progress is shown optimistically, so offline it waits for the connection instead of
    // failing (see `lib/offline-mutations.ts`).
    meta: { offline: "wait" },
    onMutate: async (step) => {
      await queryClient.cancelQueries({ queryKey: profileKey });

      const previousProfile = queryClient.getQueryData<UserProfile>(profileKey);

      if (previousProfile) {
        queryClient.setQueryData<UserProfile>(profileKey, {
          ...previousProfile,
          userGuideStep: Math.max(previousProfile.userGuideStep ?? 0, step),
        });
      }

      return { previousProfile };
    },
    onError: (_error, _step, context) => {
      const currentProfile = queryClient.getQueryData<UserProfile>(profileKey);
      const currentStep = currentProfile?.userGuideStep ?? 0;
      const previousStep = context?.previousProfile?.userGuideStep ?? 0;

      if (context?.previousProfile && currentStep <= previousStep) {
        queryClient.setQueryData(profileKey, context.previousProfile);
      }
    },
    onSuccess: (profile) => {
      const currentProfile = queryClient.getQueryData<UserProfile>(profileKey);
      const currentStep = currentProfile?.userGuideStep ?? 0;
      const nextStep = profile.userGuideStep ?? 0;

      queryClient.setQueryData<UserProfile>(profileKey, {
        ...profile,
        userGuideStep: Math.max(currentStep, nextStep),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: profileKey,
        refetchType: "active",
      });
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

export function settingsQueryOptions(authUserId: string | undefined) {
  return queryOptions({
    queryKey: settingsKeys.preferences(authUserId),
    queryFn: getSettings,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSettings() {
  const { user } = useAuth();

  return useQuery({
    ...settingsQueryOptions(user?.id),
    enabled: Boolean(user?.id),
  });
}

export function useUpdateSettings() {
  return useQueuedWrite((payload: UpdateSettingsPayload, userId, client) => {
    const previous = client.getQueryData<UserSettings>(settingsKeys.preferences(userId));
    const local: UserSettings = { user_id: userId, ...DEFAULT_SETTINGS, ...previous, ...payload };
    if ("theme" in payload || "default_accent" in payload) {
      const theme = { theme: local.theme, default_accent: local.default_accent };
      applyNativeThemeSettings(theme);
      void writeCachedNativeThemeSettings(userId, theme).catch(() => {});
    }
    return { entity: "settings", action: "update", id: userId, userId, payload, local };
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
