import { UserProfile } from "@/types/settings";

export interface UserStatistics {
  wishlists_count: number;
  total_items_count: number;
  reserved_items_count: number;
  purchased_items_count: number;
}

export type PublicProfile = Pick<
  UserProfile,
  "id" | "display_name" | "nickname" | "avatar_url"
>;