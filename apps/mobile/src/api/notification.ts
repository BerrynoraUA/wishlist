import { supabase } from "@/lib/supabase";
import type { Notification, PaginationParams } from "@/types";

export interface GetNotificationsParams {
  limit?: number;
  offset?: number;
  unread_only?: boolean;
}

export async function getUserNotifications(
  params: GetNotificationsParams = {}
): Promise<Notification[]> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.user) throw new Error("Not authenticated");

  const { limit = 20, offset = 0, unread_only = false } = params;

  const { data, error } = await supabase.rpc("get_user_notifications", {
    p_user_id: session.user.id,
    p_limit: limit,
    p_offset: offset,
    p_unread_only: unread_only,
  });

  if (error) throw error;
  return data || [];
}

export async function markNotificationAsRead(
  notificationId: string
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) throw error;
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("receiver_id", session.user.id)
    .eq("is_read", false);

  if (error) throw error;
}

export async function deleteAllNotifications(): Promise<void> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("receiver_id", session.user.id);

  if (error) throw error;
}

export async function deleteNotification(
  notificationId: string
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (error) throw error;
}

export async function getUnreadNotificationsCount(): Promise<number> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.user) throw new Error("Not authenticated");

  const { data, error } = await supabase.rpc(
    "get_unread_notifications_count",
    { p_user_id: session.user.id }
  );

  if (error) throw error;
  return data || 0;
}
