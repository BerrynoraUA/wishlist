import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { getRandomDefaultAvatarUrl } from "@wishlist/backend/lib/default-avatars";
import { toast } from "sonner";
import {
  getProfile,
  updateProfile,
  updateUserGuideStep,
  uploadAvatar,
  selectDefaultAvatar,
  getSettings,
  updateSettings,
  changePassword,
  deleteAccount,
  getAuthProvider,
  checkNicknameAvailable,
  getProfilesByIds,
  getExchangeRates,
} from "@/api/settings";
import type {
  UpdateProfilePayload,
  UpdateSettingsPayload,
  UserProfile,
  UserSettings,
} from "@/types/settings";

/* ── Query keys ── */
export const settingsKeys = {
  all: ["settings"] as const,
  profile: () => [...settingsKeys.all, "profile"] as const,
  preferences: () => [...settingsKeys.all, "preferences"] as const,
  provider: () => [...settingsKeys.all, "provider"] as const,
  exchangeRates: () => [...settingsKeys.all, "exchange-rates"] as const,
  profilesByIds: (idsKey: string) => [...settingsKeys.all, "profiles-by-ids", idsKey] as const,
};

/* ── Profile ── */

export function useProfile(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: settingsKeys.profile(),
    queryFn: getProfile,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Gives a profile with no picture one of the ten default avatars — the same write the
 * picker makes when a default is chosen by hand. The app does this rather than the
 * database because building the URL needs the project's storage host, which Postgres
 * has no way to know. Silent on purpose: nobody asked for this write.
 */
export function useEnsureDefaultAvatar() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const assignedRef = useRef(false);

  useEffect(() => {
    if (!profile || profile.avatar_url || assignedRef.current) return;

    assignedRef.current = true;
    updateProfile({ avatar_url: getRandomDefaultAvatarUrl() })
      .then((next) => queryClient.setQueryData(settingsKeys.profile(), next))
      .catch(() => {
        // Retried on the next load; an avatar is not worth an error toast.
        assignedRef.current = false;
      });
  }, [profile, queryClient]);
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.profile() });
      toast.success("Profile updated");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update profile");
    },
  });
}

export function useUpdateUserGuideStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (step: number) => updateUserGuideStep(step),
    onMutate: async (step) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.profile() });

      const previousProfile = queryClient.getQueryData<UserProfile>(settingsKeys.profile());

      if (previousProfile) {
        queryClient.setQueryData<UserProfile>(settingsKeys.profile(), {
          ...previousProfile,
          userGuideStep: Math.max(previousProfile.userGuideStep ?? 0, step),
        });
      }

      return { previousProfile };
    },
    onError: (_error, _step, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(settingsKeys.profile(), context.previousProfile);
      }
      toast.error(_error.message || "Failed to update guide progress");
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(settingsKeys.profile(), profile);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: settingsKeys.profile(),
        refetchType: "active",
      });
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.profile() });
      toast.success("Avatar uploaded");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to upload avatar");
    },
  });
}

export function useSelectDefaultAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (url: string) => selectDefaultAvatar(url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.profile() });
      toast.success("Avatar updated");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update avatar");
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

/* ── Settings (preferences) ── */

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.preferences(),
    queryFn: getSettings,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateSettingsPayload) => updateSettings(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.preferences() });

      const previousSettings = queryClient.getQueryData<UserSettings>(settingsKeys.preferences());

      if (previousSettings) {
        queryClient.setQueryData<UserSettings>(settingsKeys.preferences(), {
          ...previousSettings,
          ...payload,
        });
      }

      return { previousSettings };
    },
    onError: (_error, _payload, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(settingsKeys.preferences(), context.previousSettings);
      }
      toast.error(_error.message || "Failed to update settings");
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsKeys.preferences(), settings);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: settingsKeys.preferences(),
        refetchType: "active",
      });
    },
  });
}

/* ── Account ── */

export function useAuthProvider() {
  return useQuery({
    queryKey: settingsKeys.provider(),
    queryFn: getAuthProvider,
    staleTime: Infinity,
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (newPassword: string) => changePassword(newPassword),
    onSuccess: () => {
      toast.success("Password changed");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to change password");
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => deleteAccount(),
    onSuccess: () => {
      toast.success("Account deleted");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete account");
    },
  });
}

/* ── Exchange Rates ── */

export function useExchangeRates() {
  return useQuery({
    queryKey: settingsKeys.exchangeRates(),
    queryFn: getExchangeRates,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
