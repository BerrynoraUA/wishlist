import { supabase } from "@/lib/supabase";
import type {
  UserProfile,
  UserSettings,
  UpdateProfilePayload,
  UpdateSettingsPayload,
} from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";

/* ── Profile ── */

export async function getProfile(): Promise<UserProfile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, nickname, bio, avatar_url, created_at")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(
  payload: UpdateProfilePayload
): Promise<UserProfile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id)
    .select("id, display_name, nickname, bio, avatar_url, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function checkNicknameAvailable(
  nickname: string
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
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
  "id" | "display_name" | "nickname" | "avatar_url" | "bio"
>;

export async function getProfilesByIds(
  userIds: string[]
): Promise<PublicProfile[]> {
  const uniqueIds = Array.from(new Set(userIds)).filter(Boolean);
  if (uniqueIds.length === 0) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, nickname, avatar_url, bio")
    .in("id", uniqueIds);

  if (error) throw error;
  return (data ?? []) as PublicProfile[];
}

/* ── Avatar ── */

export async function uploadAvatar(uri: string): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) throw new Error("Not authenticated");

  // Get existing avatar for cleanup
  let previousAvatarUrl: string | null = null;
  try {
    const currentProfile = await getProfile();
    previousAvatarUrl = currentProfile.avatar_url;
  } catch {
    // ignore
  }

  const response = await fetch(uri);
  const blob = await response.blob();

  const ext = uri.split(".").pop()?.split("?")[0] || "jpg";
  const randomString = Math.random().toString(36).slice(2, 15);
  const path = `${session.user.id}/${Date.now()}-${randomString}.${ext}`;

  const { data: uploaded, error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, blob, {
      cacheControl: "3600",
      upsert: false,
      contentType: blob.type || "image/jpeg",
    });

  if (uploadError) throw new Error(uploadError.message || "Failed to upload avatar");

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(uploaded.path);

  await updateProfile({ avatar_url: publicUrl });

  if (
    previousAvatarUrl &&
    previousAvatarUrl !== publicUrl &&
    previousAvatarUrl.includes("/storage/v1/object/public/avatars/")
  ) {
    const urlParts = previousAvatarUrl.split("/avatars/");
    if (urlParts.length >= 2) {
      const oldPath = urlParts[1].split("?")[0];
      if (oldPath) {
        await supabase.storage.from("avatars").remove([oldPath]).catch(() => {});
      }
    }
  }

  return publicUrl;
}

/* ── Settings ── */

export async function getSettings(): Promise<UserSettings> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { user_id: user.id, ...DEFAULT_SETTINGS };
  return data;
}

export async function updateSettings(
  payload: UpdateSettingsPayload
): Promise<UserSettings> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, ...payload, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/* ── Account ── */

export async function changePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
}

export async function getAuthProvider(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "email";
  return user.app_metadata?.provider ?? "email";
}

export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc("delete_user_account");

  if (error) throw error;
  await supabase.auth.signOut();
}
