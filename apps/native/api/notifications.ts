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

  if (error) {
    console.error("[push] failed to load Supabase user", error);
    throw error;
  }

  return user;
}

async function getNotificationDeviceId() {
  const existingDeviceId = await SecureStore.getItemAsync(PUSH_DEVICE_ID_STORAGE_KEY);
  if (existingDeviceId) {
    console.log("[push] using existing notification device id", {
      deviceId: existingDeviceId,
    });
    return existingDeviceId;
  }

  const deviceId = createDeviceId();
  await SecureStore.setItemAsync(PUSH_DEVICE_ID_STORAGE_KEY, deviceId);
  console.log("[push] created notification device id", {
    deviceId,
  });
  return deviceId;
}

export async function getStoredExpoPushToken() {
  return SecureStore.getItemAsync(PUSH_TOKEN_STORAGE_KEY);
}

export async function registerPushToken(input: RegisterPushTokenInput): Promise<void> {
  console.log("[push] Supabase token registration started", {
    platform: input.platform,
    tokenPrefix: input.expoPushToken.slice(0, 24),
  });

  const user = await getCurrentUser();
  if (!user) {
    console.error("[push] Supabase token registration stopped: not authenticated");
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

  console.log("[push] upserting Supabase push token", {
    userId: payload.user_id,
    platform: payload.platform,
    deviceId: payload.device_id,
    appVersion: payload.app_version,
    tokenPrefix: payload.expo_push_token.slice(0, 24),
  });

  const { error } = await supabase
    .from("notification_push_tokens")
    .upsert(payload, { onConflict: "expo_push_token" });

  if (error) {
    console.error("[push] Supabase push token upsert failed", error);
    throw error;
  }

  await SecureStore.setItemAsync(PUSH_TOKEN_STORAGE_KEY, input.expoPushToken);
  console.log("[push] Supabase push token upsert succeeded");
}

export async function deactivatePushToken(expoPushToken: string): Promise<void> {
  console.log("[push] deactivating Supabase push token", {
    tokenPrefix: expoPushToken.slice(0, 24),
  });

  const user = await getCurrentUser();
  if (!user) {
    console.log("[push] deactivate skipped: no authenticated user");
    return;
  }

  const { error } = await supabase
    .from("notification_push_tokens")
    .update({
      enabled: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("expo_push_token", expoPushToken);

  if (error) {
    console.error("[push] Supabase push token deactivate failed", error);
    throw error;
  }

  console.log("[push] Supabase push token deactivate succeeded");
}

export async function deactivateCurrentPushToken(): Promise<void> {
  const expoPushToken = await getStoredExpoPushToken();

  console.log("[push] deactivate current token requested", {
    hasStoredToken: Boolean(expoPushToken),
  });

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
