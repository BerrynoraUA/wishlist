import { supabase } from "@/lib/supabase";
import { normalizeSearchQuery } from "@/lib/wishlists";
import type {
  GetFriendsWithoutWishlistAccessParams,
  ProfileSearchResult,
  PublicProfile,
  WishlistAccessUser,
} from "@/types/friends";

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
};

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
