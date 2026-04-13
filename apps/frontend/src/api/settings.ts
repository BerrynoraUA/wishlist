import { supabaseBrowser } from "@/lib/supabase-browser";
import { normalizeCurrencyCode, SUPPORTED_CURRENCIES } from "@/lib/currencies";
import type {
  UserProfile,
  UserSettings,
  UpdateProfilePayload,
  UpdateSettingsPayload,
} from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";
import {
  deletePublicImage,
  isSupabasePublicImageUrl,
  uploadPublicImage,
} from "@/lib/helpers/storage-image";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/image-upload";
import { PublicProfile } from "./types/user";

export async function getProfile(): Promise<UserProfile> {
  const {
    data: { user },
  } = await supabaseBrowser.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabaseBrowser
    .from("profiles")
    .select("id, display_name, nickname, bio, avatar_url, created_at")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(
  payload: UpdateProfilePayload,
): Promise<UserProfile> {
  const {
    data: { user },
  } = await supabaseBrowser.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabaseBrowser
    .from("profiles")
    .update(payload)
    .eq("id", user.id)
    .select("id, display_name, nickname, bio, avatar_url, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function checkNicknameAvailable(
  nickname: string,
): Promise<boolean> {
  const {
    data: { user },
  } = await supabaseBrowser.auth.getUser();

  const { data, error } = await supabaseBrowser
    .from("profiles")
    .select("id")
    .eq("nickname", nickname)
    .neq("id", user?.id ?? "")
    .maybeSingle();

  if (error) throw error;
  return data === null;
}

export async function getProfilesByIds(
  userIds: string[],
): Promise<PublicProfile[]> {
  const uniqueIds = Array.from(new Set(userIds)).filter(Boolean);
  if (uniqueIds.length === 0) return [];

  const { data, error } = await supabaseBrowser
    .from("profiles")
    .select("id, display_name, nickname, avatar_url")
    .in("id", uniqueIds);

  if (error) throw error;
  return (data ?? []) as PublicProfile[];
}

export async function uploadAvatar(file: File): Promise<string> {
  let previousAvatarUrl: string | null = null;
  try {
    const currentProfile = await getProfile();
    previousAvatarUrl = currentProfile.avatar_url;
  } catch {}

  const publicUrl = await uploadPublicImage({
    file,
    bucket: "avatars",
    maxBytes: MAX_IMAGE_UPLOAD_BYTES,
    oversizeMessage: "Avatar image size must be less than 5MB",
    uploadErrorMessage: "Failed to upload avatar",
    logLabel: "avatar",
  });

  await updateProfile({ avatar_url: publicUrl });

  if (
    previousAvatarUrl &&
    previousAvatarUrl !== publicUrl &&
    isSupabaseAvatarUrl(previousAvatarUrl)
  ) {
    await deleteAvatarImage(previousAvatarUrl);
  }

  return publicUrl;
}

export function isSupabaseAvatarUrl(url: string | null): boolean {
  return isSupabasePublicImageUrl(url, "avatars");
}

export async function deleteAvatarImage(avatarUrl: string): Promise<void> {
  await deletePublicImage({
    imageUrl: avatarUrl,
    bucket: "avatars",
    logLabel: "avatar image",
  });
}

export async function getSettings(): Promise<UserSettings> {
  const {
    data: { user },
  } = await supabaseBrowser.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabaseBrowser
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return { user_id: user.id, ...DEFAULT_SETTINGS };
  }

  return data;
}

export async function updateSettings(
  payload: UpdateSettingsPayload,
): Promise<UserSettings> {
  const {
    data: { user },
  } = await supabaseBrowser.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabaseBrowser
    .from("user_settings")
    .upsert(
      { user_id: user.id, ...payload, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function changePassword(newPassword: string): Promise<void> {
  const { error } = await supabaseBrowser.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
}

export async function getAuthProvider(): Promise<string> {
  const {
    data: { user },
  } = await supabaseBrowser.auth.getUser();

  if (!user) return "email";

  return user.app_metadata?.provider ?? "email";
}

export async function deleteAccount(): Promise<void> {
  const { error } = await supabaseBrowser.rpc("delete_user_account");

  if (error) throw error;

  await supabaseBrowser.auth.signOut();
}

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  updated_at: string;
}

type OpenExchangeRatesResponse = {
  result?: string;
  time_last_update_utc?: string;
  rates?: Record<string, number>;
};

async function getFallbackExchangeRates(): Promise<{
  rates: Record<string, number>;
  updatedAt: string;
}> {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD");

    if (!response.ok) {
      return { rates: {}, updatedAt: "" };
    }

    const data = (await response.json()) as OpenExchangeRatesResponse;
    const supportedCodes = new Set(
      SUPPORTED_CURRENCIES.map((item) => item.code),
    );
    const rates = Object.fromEntries(
      Object.entries(data.rates ?? {}).filter(([code, rate]) => {
        return (
          supportedCodes.has(normalizeCurrencyCode(code)) &&
          Number.isFinite(rate)
        );
      }),
    );

    return {
      rates,
      updatedAt: data.time_last_update_utc ?? "",
    };
  } catch {
    return { rates: {}, updatedAt: "" };
  }
}

export async function getExchangeRates(): Promise<ExchangeRates> {
  const { data, error } = await supabaseBrowser
    .from("exchange_rates")
    .select("base_currency, target_currency, rate, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const rates: Record<string, number> = {};
  let updatedAt = "";

  for (const row of data ?? []) {
    rates[normalizeCurrencyCode(row.target_currency)] = row.rate;
    if (!updatedAt && row.updated_at) updatedAt = row.updated_at;
  }

  const supportedCodes = SUPPORTED_CURRENCIES.map((item) => item.code);
  const missingCodes = supportedCodes.filter(
    (code) => code !== "USD" && !rates[code],
  );

  if (missingCodes.length > 0) {
    const fallback = await getFallbackExchangeRates();

    for (const code of missingCodes) {
      const fallbackRate = fallback.rates[code];
      if (fallbackRate) {
        rates[code] = fallbackRate;
      }
    }

    if (!updatedAt && fallback.updatedAt) {
      updatedAt = fallback.updatedAt;
    }
  }

  return {
    base: "USD",
    rates: { USD: 1, ...rates },
    updated_at: updatedAt,
  };
}
