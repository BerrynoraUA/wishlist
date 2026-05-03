export interface PublicProfile {
  id: string;
  display_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
}

export interface ProfileSearchResult {
  id: string;
  nickname: string;
}

export interface FriendWithDetails {
  id: string;
  user_f: string;
  user_s: string;
  created_at: string;
  friend_id: string;
  display_name: string;
  nickname: string | null;
  avatar_url: string | null;
  wishlists_count: number;
  mutual_friends_count: number;
}

export interface FriendGroup {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  created_at?: string;
  updated_at?: string;
  member_count: number;
}

export interface FriendGroupMember {
  id: string;
  nickname: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export type FriendGroupPayload = {
  name: string;
  description?: string | null;
  color: string;
  icon: string;
  memberIds: string[];
};

export type GetFriendsWithoutWishlistAccessParams = {
  wishlistId: string;
  search?: string;
  skip?: number;
  take?: number;
};

export type WishlistAccessUser = {
  id: string;
  nickname: string;
  access_type: number;
  access_role: "viewer" | "editor";
  target_type?: "user" | "group";
  group_id?: string | null;
  name?: string | null;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  member_count?: number;
  created_at?: string | null;
};
