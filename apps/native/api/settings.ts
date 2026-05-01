import { normalizeCurrencyCode, SUPPORTED_CURRENCIES } from "@wishlist/backend/lib/currencies";
import { supabase } from "@wishlist/backend/supabase/native";
import { DEFAULT_SETTINGS } from "@wishlist/backend/types/settings";
import type {
  UpdateProfilePayload,
  UpdateSettingsPayload,
  UserProfile,
  UserSettings,
} from "@wishlist/backend/types/settings";
import type { PublicProfile } from "@wishlist/backend/types/friends";

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  return user;
}

export async function getProfile(): Promise<UserProfile> {
  const user = await getCurrentUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, nickname, bio, height, shoe_size, avatar_url, created_at")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return data as UserProfile;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  const user = await getCurrentUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id)
    .select("id, display_name, nickname, bio, height, shoe_size, avatar_url, created_at")
    .single();

  if (error) throw error;
  return data as UserProfile;
}

export async function checkNicknameAvailable(nickname: string): Promise<boolean> {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("nickname", nickname)
    .neq("id", user?.id ?? "")
    .maybeSingle();

  if (error) throw error;
  return data === null;
}

export async function getProfilesByIds(userIds: string[]): Promise<PublicProfile[]> {
  const uniqueIds = Array.from(new Set(userIds)).filter(Boolean);
  if (uniqueIds.length === 0) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, nickname, avatar_url")
    .in("id", uniqueIds);

  if (error) throw error;
  return (data ?? []) as PublicProfile[];
}

export async function getSettings(): Promise<UserSettings> {
  const user = await getCurrentUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return { user_id: user.id, ...DEFAULT_SETTINGS };
  }

  return data as UserSettings;
}

export async function updateSettings(payload: UpdateSettingsPayload): Promise<UserSettings> {
  const user = await getCurrentUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, ...payload, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return data as UserSettings;
}

export async function changePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
}

export async function getAuthProvider(): Promise<string> {
  const user = await getCurrentUser();

  if (!user) return "email";

  return String(user.app_metadata?.provider ?? "email");
}

export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc("delete_user_account");

  if (error) throw error;

  await supabase.auth.signOut();
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
    const supportedCodes = new Set(SUPPORTED_CURRENCIES.map((item) => item.code));
    const rates = Object.fromEntries(
      Object.entries(data.rates ?? {}).filter(([code, rate]) => {
        return supportedCodes.has(normalizeCurrencyCode(code)) && Number.isFinite(rate);
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
  const { data, error } = await supabase
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
  const missingCodes = supportedCodes.filter((code) => code !== "USD" && !rates[code]);

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
