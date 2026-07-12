import { supabase } from "@wishlist/backend/supabase/native";
import type { Notification } from "@wishlist/backend/types";
import * as Application from "expo-application";
import * as SecureStore from "expo-secure-store";

const PUSH_TOKEN_STORAGE_KEY = "wishlane.expoPushToken";
const PUSH_DEVICE_ID_STORAGE_KEY = "wishlane.notificationDeviceId";

export type GetNotificationsParams = {
  limit?: number;
  offset?: number;
  unread_only?: boolean;
};

export type RegisterPushTokenInput = {
  expoPushToken: string;
  platform: string;
};

function createDeviceId() {
  return `device_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;

  return user;
}

async function getNotificationDeviceId() {
  const existingDeviceId = await SecureStore.getItemAsync(PUSH_DEVICE_ID_STORAGE_KEY);
  if (existingDeviceId) return existingDeviceId;

  const deviceId = createDeviceId();
  await SecureStore.setItemAsync(PUSH_DEVICE_ID_STORAGE_KEY, deviceId, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
  return deviceId;
}

export async function getStoredExpoPushToken() {
  return SecureStore.getItemAsync(PUSH_TOKEN_STORAGE_KEY);
}

export async function registerPushToken(input: RegisterPushTokenInput): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const deviceId = await getNotificationDeviceId();
  const appVersion = Application.nativeApplicationVersion ?? Application.nativeBuildVersion ?? null;
  const payload = {
    user_id: user.id,
    expo_push_token: input.expoPushToken,
    platform: input.platform,
    device_id: deviceId,
    app_version: appVersion,
    enabled: true,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("notification_push_tokens")
    .upsert(payload, { onConflict: "expo_push_token" });

  if (error) throw error;

  await SecureStore.setItemAsync(PUSH_TOKEN_STORAGE_KEY, input.expoPushToken, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
}

export async function deactivatePushToken(expoPushToken: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const { error } = await supabase
    .from("notification_push_tokens")
    .update({
      enabled: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("expo_push_token", expoPushToken);

  if (error) throw error;
}

export async function deactivateCurrentPushToken(): Promise<void> {
  const expoPushToken = await getStoredExpoPushToken();

  if (expoPushToken) {
    await deactivatePushToken(expoPushToken);
    await SecureStore.deleteItemAsync(PUSH_TOKEN_STORAGE_KEY);
  }
}

export async function getUserNotifications(
  params: GetNotificationsParams = {},
): Promise<Notification[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { limit = 20, offset = 0, unread_only = false } = params;
  const { data, error } = await supabase.rpc("get_user_notifications", {
    p_user_id: user.id,
    p_limit: limit,
    p_offset: offset,
    p_unread_only: unread_only,
  });

  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function getUnreadNotificationsCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase.rpc("get_unread_notifications_count", {
    p_user_id: user.id,
  });

  if (error) throw error;
  return Number(data ?? 0);
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) throw error;
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("receiver_id", user.id)
    .eq("is_read", false);

  if (error) throw error;
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await supabase.from("notifications").delete().eq("id", notificationId);

  if (error) throw error;
}

export async function deleteAllNotifications(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("notifications").delete().eq("receiver_id", user.id);

  if (error) throw error;
}
