import { supabaseBrowser } from "@/lib/supabase-browser";
import { CreateWishlistShareTokenResult } from "./types/share";
import { Wishlist } from "@/types/wishlist";

export async function createWishlistShareToken(
  wishlistId: string,
  options?: { shareBaseUrl?: string },
): Promise<CreateWishlistShareTokenResult> {
  const { data, error } = await supabaseBrowser.rpc(
    "create_wishlist_share_token",
    {
      p_wishlist_id: wishlistId,
    },
  );

  if (error) throw error;
  const token = data as string;

  const shareBaseUrl = options?.shareBaseUrl;
  const shareUrl = shareBaseUrl
    ? `${shareBaseUrl}?token=${encodeURIComponent(token)}`
    : undefined;

  return { token, shareUrl };
}

export async function verifyWishlistShareToken(
  token: string,
): Promise<{ valid: boolean; wishlistId: string | null }> {
  const { data, error } = await supabaseBrowser.rpc(
    "verify_wishlist_share_token",
    {
      p_token: token,
    },
  );

  if (error) {
    return { valid: false, wishlistId: null };
  }

  const wishlistId = (data as string | null) ?? null;
  return { valid: wishlistId != null, wishlistId };
}

export async function getWishlistByToken(token: string): Promise<Wishlist> {
  const { data, error } = await supabaseBrowser.rpc(
    "get_wishlist_by_share_token",
    {
      p_token: token,
    },
  );

  if (error) {
    console.error("Error fetching wishlist:", error);
    throw new Error(error.message || "Failed to fetch wishlist");
  }

  return data as Wishlist;
}

export async function getWishlistItemsByToken<Item = any>(
  token: string,
  params: PaginationParams = {},
): Promise<Item[]> {
  const { skip = 0, take = 50 } = params;

  const { data, error } = await supabaseBrowser.rpc(
    "get_wishlist_items_by_share_token",
    {
      p_token: token,
      p_skip: skip,
      p_take: take,
    },
  );

  if (error) throw error;
  return (data as Item[]) || [];
}
