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
