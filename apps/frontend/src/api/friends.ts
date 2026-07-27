import { supabaseBrowser } from "@/lib/supabase-browser";
import { normalizeSearchQuery } from "@/lib/helpers/search";
import { getCurrentSession } from "./user";
import {
  createLocalizedNotification,
  createLocalizedNotifications,
} from "@/lib/create-notification";
import type {
  FriendRequest,
  FriendWithDetails,
  FriendRequestWithDetails,
  ProfileSearchResult,
  GetFriendsWithoutWishlistAccessParams,
  WishlistAccessUser,
  FriendGroup,
  FriendGroupMember,
  FriendGroupPayload,
} from "./types/friends";

export async function getIncomingFriendRequests({
  skip = 0,
  take = 10,
}: PaginationParams = {}): Promise<FriendRequestWithDetails[]> {
  const session = await getCurrentSession();
  const myUserId = session?.user.id;

  if (!myUserId) throw new Error("Not authenticated");

  const { data, error } = await supabaseBrowser.rpc("get_incoming_friend_requests_with_details", {
    p_user_id: myUserId,
    p_skip: skip,
    p_take: take,
  });

  if (error) throw error;

  return data ?? [];
}

export async function getOutgoingFriendRequests({
  skip = 0,
  take = 10,
}: PaginationParams = {}): Promise<FriendRequestWithDetails[]> {
  const session = await getCurrentSession();
  const myUserId = session?.user.id;

  if (!myUserId) throw new Error("Not authenticated");

  const { data, error } = await supabaseBrowser.rpc("get_outgoing_friend_requests_with_details", {
    p_user_id: myUserId,
    p_skip: skip,
    p_take: take,
  });

  if (error) throw error;

  return data ?? [];
}

export async function sendFriendRequest(receiverId: string): Promise<FriendRequest> {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error("Not authenticated");

  if (session.user.id === receiverId) {
    throw new Error("Cannot send friend request to yourself");
  }

  const { data, error } = await supabaseBrowser
    .from("friend_requests")
    .insert({
      sender_id: session.user.id,
      receiver_id: receiverId,
      status: 0,
    })
    .select()
    .single();

  if (error) throw error;

  void createLocalizedNotification({
    receiverId,
    key: "friend_request",
    vars: {},
    entityId: session.user.id,
  });

  return data;
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  const { data, error } = await supabaseBrowser.rpc("accept_friend_request", {
    p_request_id: requestId,
  });

  if (error) throw error;

  const requesterId = data as string | null;
  if (requesterId) {
    void createLocalizedNotification({
      receiverId: requesterId,
      key: "friend_accepted",
      vars: {},
    });
  }
}

export async function rejectFriendRequest(requestId: string): Promise<void> {
  const { data, error } = await supabaseBrowser.rpc("reject_friend_request", {
    p_request_id: requestId,
  });

  if (error) throw error;

  const requesterId = data as string | null;
  if (requesterId) {
    void createLocalizedNotification({
      receiverId: requesterId,
      key: "friend_declined",
      vars: {},
    });
  }
}

export async function cancelFriendRequest(requestId: string): Promise<void> {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error("Not authenticated");

  const { error } = await supabaseBrowser
    .from("friend_requests")
    .delete()
    .eq("id", requestId)
    .eq("sender_id", session.user.id);

  if (error) throw error;
}

export async function getFriends({ skip = 0, take = 10, search }: PaginationParams = {}): Promise<
  FriendWithDetails[]
> {
  const session = await getCurrentSession();
  const myUserId = session?.user.id;

  if (!myUserId) throw new Error("Not authenticated");

  const normalizedSearch = normalizeSearchQuery(search);

  const { data, error } = await supabaseBrowser.rpc("get_friends", {
    p_skip: skip,
    p_take: take,
    p_search: normalizedSearch || null,
  });

  if (error) throw error;

  return data ?? [];
}

export async function searchProfilesByNickname({
  query,
  skip = 0,
  take = 20,
}: {
  query: string;
  skip?: number;
  take?: number;
}): Promise<ProfileSearchResult[]> {
  const session = await getCurrentSession();
  const myUserId = session?.user?.id;

  if (!myUserId) throw new Error("Not authenticated");

  const trimmed = normalizeSearchQuery(query);
  if (!trimmed) return [];

  const { data, error } = await supabaseBrowser.rpc("search_profiles_by_nickname", {
    p_query: trimmed,
    p_skip: skip,
    p_take: take,
  });

  if (error) throw error;

  return data ?? [];
}

export async function checkFriendship(userId: string): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error("Not authenticated");

  const { data, error } = await supabaseBrowser
    .from("friends")
    .select("id")
    .or(
      `and(user_f.eq.${session.user.id},user_s.eq.${userId}),and(user_f.eq.${userId},user_s.eq.${session.user.id})`,
    )
    .maybeSingle();

  if (error) throw error;

  return !!data;
}

export async function removeFriend(userId: string): Promise<void> {
  const session = await getCurrentSession();
  if (!session?.user) throw new Error("Not authenticated");

  const { error } = await supabaseBrowser
    .from("friends")
    .delete()
    .or(
      `and(user_f.eq.${session.user.id},user_s.eq.${userId}),and(user_f.eq.${userId},user_s.eq.${session.user.id})`,
    );

  if (error) throw error;
}

export async function getFriendsWithoutWishlistAccess({
  wishlistId,
  search,
  skip = 0,
  take = 20,
}: GetFriendsWithoutWishlistAccessParams): Promise<ProfileSearchResult[]> {
  const normalizedSearch = normalizeSearchQuery(search);

  const { data, error } = await supabaseBrowser.rpc("get_friends_without_wishlist_access", {
    p_wishlist_id: wishlistId,
    p_search: normalizedSearch || null,
    p_skip: skip,
    p_take: take,
  });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    nickname: row.nickname,
  }));
}

export async function getWishlistAccessList(wishlistId: string): Promise<WishlistAccessUser[]> {
  const { data, error } = await supabaseBrowser.rpc("get_wishlist_access_list", {
    p_wishlist_id: wishlistId,
  });

  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const targetType = row.target_type ?? (row.group_id ? "group" : "user");
    const targetId =
      row.target_id ??
      row.granted_to_user_id ??
      row.target_user_id ??
      row.user_id ??
      row.group_id ??
      row.id;

    return {
      id: targetId,
      nickname: row.nickname ?? row.owner_nickname ?? row.display_name ?? row.name ?? "unknown",
      access_type: row.access_type,
      access_role: row.access_type === 1 ? "editor" : "viewer",
      target_type: targetType,
      group_id: row.group_id ?? null,
      name: row.name ?? null,
      description: row.description ?? null,
      color: row.color ?? null,
      icon: row.icon ?? null,
      member_count: Number(row.member_count ?? 0),
      created_at: row.created_at,
    } satisfies WishlistAccessUser;
  });
}

export async function getFriendGroups({
  skip = 0,
  take = 20,
  search,
}: PaginationParams = {}): Promise<FriendGroup[]> {
  const normalizedSearch = normalizeSearchQuery(search);

  const { data, error } = await supabaseBrowser.rpc("get_friend_groups", {
    p_search: normalizedSearch || null,
    p_skip: skip,
    p_take: take,
  });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    color: row.color ?? "pink",
    icon: row.icon ?? "users",
    created_at: row.created_at,
    updated_at: row.updated_at,
    member_count: Number(row.member_count ?? 0),
  }));
}

export async function getFriendGroupMembers(groupId: string): Promise<FriendGroupMember[]> {
  const { data, error } = await supabaseBrowser.rpc("get_friend_group_members", {
    p_group_id: groupId,
  });

  if (error) throw error;

  return data ?? [];
}

export async function createFriendGroup(payload: FriendGroupPayload) {
  const { data, error } = await supabaseBrowser.rpc("create_friend_group", {
    p_name: payload.name,
    p_description: payload.description ?? null,
    p_color: payload.color,
    p_icon: payload.icon,
    p_member_ids: payload.memberIds,
  });

  if (error) throw error;

  const groupId = (data as { id?: string } | null)?.id ?? null;
  notifyGroupMembersAdded(groupId, payload.name, payload.memberIds);

  return data;
}

export async function updateFriendGroup(groupId: string, payload: FriendGroupPayload) {
  const { data, error } = await supabaseBrowser.rpc("update_friend_group", {
    p_group_id: groupId,
    p_name: payload.name,
    p_description: payload.description ?? null,
    p_color: payload.color,
    p_icon: payload.icon,
    p_member_ids: payload.memberIds,
  });

  if (error) throw error;

  notifyGroupMembersAdded(groupId, payload.name, payload.memberIds);

  return data;
}

/**
 * Notifies each group member that they were added. create_notification() dedupes by
 * (receiver, group) and skips self, so re-sending on update is safe.
 */
function notifyGroupMembersAdded(
  groupId: string | null,
  groupName: string,
  memberIds: string[] | undefined,
) {
  if (!groupId || !memberIds?.length) return;

  void createLocalizedNotifications(
    memberIds.map((receiverId) => ({
      receiverId,
      key: "group_added" as const,
      vars: { group: groupName },
      entityId: groupId,
    })),
  );
}

export async function deleteFriendGroup(groupId: string) {
  const { data, error } = await supabaseBrowser.rpc("delete_friend_group", {
    p_group_id: groupId,
  });

  if (error) throw error;
  return data;
}

export async function getFriendGroupsWithoutWishlistAccess({
  wishlistId,
  search,
  skip = 0,
  take = 20,
}: GetFriendsWithoutWishlistAccessParams): Promise<FriendGroup[]> {
  const normalizedSearch = normalizeSearchQuery(search);

  const { data, error } = await supabaseBrowser.rpc("get_friend_groups_without_wishlist_access", {
    p_wishlist_id: wishlistId,
    p_search: normalizedSearch || null,
    p_skip: skip,
    p_take: take,
  });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    color: row.color ?? "pink",
    icon: row.icon ?? "users",
    member_count: Number(row.member_count ?? 0),
  }));
}

export async function grantWishlistGroupAccess(wishlistId: string, groupId: string) {
  const { data, error } = await supabaseBrowser.rpc("grant_wishlist_group_access", {
    p_wishlist_id: wishlistId,
    p_group_id: groupId,
  });

  if (error) throw error;
  return data;
}

export async function revokeWishlistGroupAccess(wishlistId: string, groupId: string) {
  const { data, error } = await supabaseBrowser.rpc("revoke_wishlist_group_access", {
    p_wishlist_id: wishlistId,
    p_group_id: groupId,
  });

  if (error) throw error;
  return data;
}
