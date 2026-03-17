import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  getSettings,
  updateSettings,
  changePassword,
  deleteAccount,
  getAuthProvider,
  checkNicknameAvailable,
  getProfilesByIds,
} from "@/api/settings";
import type {
  UpdateProfilePayload,
  UpdateSettingsPayload,
} from "@/types/settings";

/* ── Query keys ── */
export const settingsKeys = {
  all: ["settings"] as const,
  profile: () => [...settingsKeys.all, "profile"] as const,
  preferences: () => [...settingsKeys.all, "preferences"] as const,
  provider: () => [...settingsKeys.all, "provider"] as const,
  profilesByIds: (idsKey: string) =>
    [...settingsKeys.all, "profiles-by-ids", idsKey] as const,
};

/* ── Profile ── */

export function useProfile() {
  return useQuery({
    queryKey: settingsKeys.profile(),
    queryFn: getProfile,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.profile() });
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.profile() });
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: settingsKeys.preferences(),
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
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => deleteAccount(),
  });
}
