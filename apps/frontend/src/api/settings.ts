import { supabaseBrowser } from "@/lib/supabase-browser";
import type {
  UserProfile,
  UserSettings,
  UpdateProfilePayload,
  UpdateSettingsPayload,
} from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";

/* ────────────────────────────────────────
   Profile
   ──────────────────────────────────────── */

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

export type PublicProfile = Pick<
  UserProfile,
  "id" | "display_name" | "nickname" | "avatar_url"
>;

export async function getProfilesByIds(userIds: string[]): Promise<PublicProfile[]> {
  const uniqueIds = Array.from(new Set(userIds)).filter(Boolean);
  if (uniqueIds.length === 0) return [];

  const { data, error } = await supabaseBrowser
    .from("profiles")
    .select("id, display_name, nickname, avatar_url")
    .in("id", uniqueIds);

  if (error) throw error;
  return (data ?? []) as PublicProfile[];
}

/* ────────────────────────────────────────
   Avatar
   ──────────────────────────────────────── */

export async function uploadAvatar(file: File): Promise<string> {
  const {
    data: { session },
  } = await supabaseBrowser.auth.getSession();

  if (!session?.user) throw new Error("Not authenticated");

  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Avatar image size must be less than 2MB");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  // Capture current avatar to clean up old files (best-effort)
  let previousAvatarUrl: string | null = null;
  try {
    const currentProfile = await getProfile();
    previousAvatarUrl = currentProfile.avatar_url;
  } catch {
    // ignore — upload/update should still proceed
  }

  const fileExt = (file.name.split(".").pop() ?? "png").toLowerCase();
  const randomString = Math.random().toString(36).slice(2, 15);
  const path = `${session.user.id}/${Date.now()}-${randomString}.${fileExt}`;

  const { data: uploaded, error: uploadError } = await supabaseBrowser.storage
    .from("avatars")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Error uploading avatar:", uploadError);
    throw new Error(uploadError.message || "Failed to upload avatar");
  }

  const {
    data: { publicUrl },
  } = supabaseBrowser.storage.from("avatars").getPublicUrl(uploaded.path);

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
  if (!url) return false;
  return url.includes("/storage/v1/object/public/avatars/");
}

export async function deleteAvatarImage(avatarUrl: string): Promise<void> {
  if (!avatarUrl) return;
  if (!isSupabaseAvatarUrl(avatarUrl)) return;

  const urlParts = avatarUrl.split("/avatars/");
  if (urlParts.length < 2) return;

  const path = urlParts[1].split("?")[0];
  if (!path) return;

  const { error } = await supabaseBrowser.storage.from("avatars").remove([path]);

  if (error) {
    console.error("Error deleting avatar image:", error);
  }
}

/* ────────────────────────────────────────
   Settings (preferences)
   ──────────────────────────────────────── */

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

  // Return defaults if no settings row exists yet
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

/* ────────────────────────────────────────
   Account
   ──────────────────────────────────────── */

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
