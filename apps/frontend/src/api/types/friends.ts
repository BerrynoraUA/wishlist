export enum FriendRequestStatus {
  Pending = 0,
  Accepted = 1,
  Rejected = 2,
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: FriendRequestStatus;
  created_at: string;
}

export interface FriendRequestWithDetails {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: FriendRequestStatus;
  created_at: string;
  display_name: string;
  nickname: string | null;
  avatar_url: string | null;
  mutual_friends_count: number;
}
export interface Friendship {
  id: string;
  user_f: string;
  user_s: string;
  created_at: string;
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

export interface ProfileSearchResult {
  id: string;
  nickname: string;
}