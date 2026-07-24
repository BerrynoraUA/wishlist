import { supabase } from "@wishlist/backend/supabase/native";
import { normalizeSearchQuery } from "@/lib/wishlists";
import type {
  FriendGroupMember,
  FriendGroupPayload,
  FriendRequest,
  FriendRequestWithDetails,
  FriendGroup,
  FriendWithDetails,
  GetFriendsWithoutWishlistAccessParams,
  ProfileSearchResult,
  PublicProfile,
  WishlistAccessUser,
} from "@wishlist/backend/types/friends";

type FriendAccessRow = {
  id?: string;
  nickname?: string;
  owner_nickname?: string | null;
  display_name?: string | null;
  name?: string | null;
  access_type?: number;
  target_type?: "user" | "group";
  target_id?: string;
  granted_to_user_id?: string;
  target_user_id?: string;
  user_id?: string;
  group_id?: string | null;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  member_count?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  user_f?: string;
  user_s?: string;
  friend_id?: string;
  avatar_url?: string | null;
  wishlists_count?: number | string | null;
  mutual_friends_count?: number | string | null;
  sender_id?: string;
  receiver_id?: string;
  status?: number;
};

type PaginationParams = {
  skip?: number;
  take?: number;
  search?: string;
};

function normalizeFriendRequest(row: FriendAccessRow): FriendRequestWithDetails {
  return {
    id: row.id ?? "",
    sender_id: row.sender_id ?? "",
    receiver_id: row.receiver_id ?? "",
    status: row.status ?? 0,
    created_at: row.created_at ?? "",
    display_name: row.display_name ?? "",
    nickname: row.nickname ?? null,
    avatar_url: row.avatar_url ?? null,
    mutual_friends_count: Number(row.mutual_friends_count ?? 0),
  };
}

export async function getIncomingFriendRequests({
  skip = 0,
  take = 10,
}: PaginationParams = {}): Promise<FriendRequestWithDetails[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase.rpc("get_incoming_friend_requests_with_details", {
    p_user_id: user.id,
    p_skip: skip,
    p_take: take,
  });

  if (error) throw error;

  return ((data ?? []) as FriendAccessRow[]).map(normalizeFriendRequest);
}

export async function getOutgoingFriendRequests({
  skip = 0,
  take = 10,
}: PaginationParams = {}): Promise<FriendRequestWithDetails[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase.rpc("get_outgoing_friend_requests_with_details", {
    p_user_id: user.id,
    p_skip: skip,
    p_take: take,
  });

  if (error) throw error;

  return ((data ?? []) as FriendAccessRow[]).map(normalizeFriendRequest);
}

export async function sendFriendRequest(receiverId: string): Promise<FriendRequest> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");
  if (user.id === receiverId) throw new Error("Cannot send friend request to yourself");

  const { data, error } = await supabase
    .from("friend_requests")
    .insert({
      sender_id: user.id,
      receiver_id: receiverId,
      status: 0,
    })
    .select()
    .single();

  if (error) throw error;

  return data as FriendRequest;
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc("accept_friend_request", {
    p_request_id: requestId,
  });

  if (error) throw error;
}

export async function rejectFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc("reject_friend_request", {
    p_request_id: requestId,
  });

  if (error) throw error;
}

export async function cancelFriendRequest(requestId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("friend_requests")
    .delete()
    .eq("id", requestId)
    .eq("sender_id", user.id);

  if (error) throw error;
}

export async function checkFriendship(userId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("friends")
    .select("id")
    .or(
      `and(user_f.eq.${user.id},user_s.eq.${userId}),and(user_f.eq.${userId},user_s.eq.${user.id})`,
    )
    .maybeSingle();

  if (error) throw error;

  return Boolean(data);
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

export async function searchProfilesByNickname({
  query,
  skip = 0,
  take = 20,
}: {
  query: string;
  skip?: number;
  take?: number;
}): Promise<ProfileSearchResult[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const normalizedSearch = normalizeSearchQuery(query);
  if (!normalizedSearch) return [];

  const { data, error } = await supabase.rpc("search_profiles_by_nickname", {
    p_query: normalizedSearch,
    p_skip: skip,
    p_take: take,
  });

  if (error) throw error;

  return ((data ?? []) as FriendAccessRow[]).map((row) => ({
    id: row.id ?? "",
    nickname: row.nickname ?? "unknown",
    display_name: row.display_name ?? null,
    avatar_url: row.avatar_url ?? null,
  }));
}

export async function getFriends({ skip = 0, take = 20, search }: PaginationParams = {}): Promise<
  FriendWithDetails[]
> {
  const normalizedSearch = normalizeSearchQuery(search);

  const { data, error } = await supabase.rpc("get_friends", {
    p_skip: skip,
    p_take: take,
    p_search: normalizedSearch || null,
  });

  if (error) throw error;

  return ((data ?? []) as FriendAccessRow[]).map((row) => ({
    id: row.id ?? "",
    user_f: row.user_f ?? "",
    user_s: row.user_s ?? "",
    created_at: row.created_at ?? "",
    friend_id: row.friend_id ?? row.user_id ?? row.id ?? "",
    display_name: row.display_name ?? "",
    nickname: row.nickname ?? null,
    avatar_url: row.avatar_url ?? null,
    wishlists_count: Number(row.wishlists_count ?? 0),
    mutual_friends_count: Number(row.mutual_friends_count ?? 0),
  }));
}

export async function removeFriend(userId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("friends")
    .delete()
    .or(
      `and(user_f.eq.${user.id},user_s.eq.${userId}),and(user_f.eq.${userId},user_s.eq.${user.id})`,
    );

  if (error) throw error;
}

export async function getFriendGroups({
  skip = 0,
  take = 20,
  search,
}: PaginationParams = {}): Promise<FriendGroup[]> {
  const normalizedSearch = normalizeSearchQuery(search);

  const { data, error } = await supabase.rpc("get_friend_groups", {
    p_search: normalizedSearch || null,
    p_skip: skip,
    p_take: take,
  });

  if (error) throw error;

  return ((data ?? []) as FriendAccessRow[]).map((row) => ({
    id: row.id ?? "",
    name: row.name ?? "Group",
    description: row.description ?? null,
    color: row.color ?? "pink",
    icon: row.icon ?? "users",
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
    member_count: Number(row.member_count ?? 0),
  }));
}

export async function getFriendGroupMembers(groupId: string): Promise<FriendGroupMember[]> {
  const { data, error } = await supabase.rpc("get_friend_group_members", {
    p_group_id: groupId,
  });

  if (error) throw error;

  return ((data ?? []) as FriendAccessRow[]).map((row) => ({
    id: row.id ?? "",
    nickname: row.nickname ?? null,
    display_name: row.display_name ?? null,
    avatar_url: row.avatar_url ?? null,
  }));
}

export async function createFriendGroup(payload: FriendGroupPayload) {
  const { data, error } = await supabase.rpc("create_friend_group", {
    p_name: payload.name,
    p_description: payload.description ?? null,
    p_color: payload.color,
    p_icon: payload.icon,
    p_member_ids: payload.memberIds,
  });

  if (error) throw error;
  return data;
}

export async function updateFriendGroup(groupId: string, payload: FriendGroupPayload) {
  const { data, error } = await supabase.rpc("update_friend_group", {
    p_group_id: groupId,
    p_name: payload.name,
    p_description: payload.description ?? null,
    p_color: payload.color,
    p_icon: payload.icon,
    p_member_ids: payload.memberIds,
  });

  if (error) throw error;
  return data;
}

export async function deleteFriendGroup(groupId: string) {
  const { data, error } = await supabase.rpc("delete_friend_group", {
    p_group_id: groupId,
  });

  if (error) throw error;
  return data;
}

export async function getFriendsWithoutWishlistAccess({
  wishlistId,
  search,
  skip = 0,
  take = 20,
}: GetFriendsWithoutWishlistAccessParams): Promise<ProfileSearchResult[]> {
  const normalizedSearch = normalizeSearchQuery(search);

  const { data, error } = await supabase.rpc("get_friends_without_wishlist_access", {
    p_wishlist_id: wishlistId,
    p_search: normalizedSearch || null,
    p_skip: skip,
    p_take: take,
  });

  if (error) throw error;

  return ((data ?? []) as FriendAccessRow[]).map((row) => ({
    id: row.id ?? "",
    nickname: row.nickname ?? "unknown",
    display_name: row.display_name ?? null,
    avatar_url: row.avatar_url ?? null,
  }));
}

export async function getFriendGroupsWithoutWishlistAccess({
  wishlistId,
  search,
  skip = 0,
  take = 20,
}: GetFriendsWithoutWishlistAccessParams): Promise<FriendGroup[]> {
  const normalizedSearch = normalizeSearchQuery(search);

  const { data, error } = await supabase.rpc("get_friend_groups_without_wishlist_access", {
    p_wishlist_id: wishlistId,
    p_search: normalizedSearch || null,
    p_skip: skip,
    p_take: take,
  });

  if (error) throw error;

  return ((data ?? []) as FriendAccessRow[]).map((row) => ({
    id: row.id ?? "",
    name: row.name ?? "Group",
    description: row.description ?? null,
    color: row.color ?? "pink",
    icon: row.icon ?? "users",
    member_count: Number(row.member_count ?? 0),
  }));
}

export async function getWishlistAccessList(wishlistId: string): Promise<WishlistAccessUser[]> {
  const { data, error } = await supabase.rpc("get_wishlist_access_list", {
    p_wishlist_id: wishlistId,
  });

  if (error) throw error;

  return ((data ?? []) as FriendAccessRow[]).map((row) => {
    const targetType = row.target_type ?? (row.group_id ? "group" : "user");
    const targetId =
      row.target_id ??
      row.granted_to_user_id ??
      row.target_user_id ??
      row.user_id ??
      row.group_id ??
      row.id ??
      "";

    return {
      id: targetId,
      nickname: row.nickname ?? row.owner_nickname ?? row.display_name ?? row.name ?? "unknown",
      access_type: row.access_type ?? 0,
      access_role: row.access_type === 1 ? "editor" : "viewer",
      target_type: targetType,
      group_id: row.group_id ?? null,
      name: row.name ?? null,
      description: row.description ?? null,
      color: row.color ?? null,
      icon: row.icon ?? null,
      member_count: Number(row.member_count ?? 0),
      created_at: row.created_at ?? null,
    } satisfies WishlistAccessUser;
  });
}

export async function grantWishlistGroupAccess(wishlistId: string, groupId: string) {
  const { data, error } = await supabase.rpc("grant_wishlist_group_access", {
    p_wishlist_id: wishlistId,
    p_group_id: groupId,
  });

  if (error) throw error;
  return data;
}

export async function revokeWishlistGroupAccess(wishlistId: string, groupId: string) {
  const { data, error } = await supabase.rpc("revoke_wishlist_group_access", {
    p_wishlist_id: wishlistId,
    p_group_id: groupId,
  });

  if (error) throw error;
  return data;
}
