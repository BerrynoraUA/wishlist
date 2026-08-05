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
} from "@/api/settings";
import {
  applyNativeThemeSettings,
  writeCachedNativeThemeSettings,
  type CachedNativeThemeSettings,
} from "@/lib/theme";
import { useAuth } from "@/providers/auth-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export function useUpdateUserGuideStep() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const profileKey = settingsKeys.profile(user?.id);

  return useMutation({
    mutationFn: (step: number) => updateProfile({ userGuideStep: step }),
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
  const preferencesKey = settingsKeys.preferences(user?.id);

  function persistNativeThemeSettings(settings: UserSettings) {
    if (!user?.id) return;

    const themeSettings: CachedNativeThemeSettings = {
      theme: settings.theme,
      default_accent: settings.default_accent,
    };

    applyNativeThemeSettings(themeSettings);
    void writeCachedNativeThemeSettings(user.id, themeSettings).catch(() => {});
  }

  return useMutation({
    mutationFn: (payload: UpdateSettingsPayload) => updateSettings(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: preferencesKey });

      const previousSettings = queryClient.getQueryData<UserSettings>(preferencesKey);

      if (user?.id) {
        const baseSettings =
          previousSettings ??
          ({
            user_id: user.id,
            ...DEFAULT_SETTINGS,
          } satisfies UserSettings);
        const optimisticSettings = {
          ...baseSettings,
          ...payload,
        };

        queryClient.setQueryData<UserSettings>(preferencesKey, optimisticSettings);

        if ("theme" in payload || "default_accent" in payload) {
          persistNativeThemeSettings(optimisticSettings);
        }
      }

      return { previousSettings };
    },
    onError: (_error, payload, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(preferencesKey, context.previousSettings);

        if ("theme" in payload || "default_accent" in payload) {
          persistNativeThemeSettings(context.previousSettings);
        }
      }
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(preferencesKey, settings);
      persistNativeThemeSettings(settings);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: preferencesKey,
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
