import { supabase } from "@/lib/supabase";

export async function createWishlistShareToken(wishlistId: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_wishlist_share_token", {
    p_wishlist_id: wishlistId,
  });

  if (error) throw error;

  return data as string;
}
