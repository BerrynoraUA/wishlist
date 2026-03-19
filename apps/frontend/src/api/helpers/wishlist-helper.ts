import { supabaseBrowser } from "@/lib/supabase-browser";
import { Wishlist } from "@/types/wishlist";

export async function getWishlists(
  filter: (query: any) => any,
  { skip = 0, take = 10, search }: PaginationParams = {},
): Promise<Wishlist[]> {
  const {
    data: { session },
    error: sessionError,
  } = await supabaseBrowser.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.user) throw new Error("Not authenticated");

  let query = supabaseBrowser
    .from("wishlist")
    .select("*, item(count)")
    .order("created_at", { ascending: false })
    .range(skip, skip + take - 1);

  if (search && search.trim() !== "") {
    query = query.ilike("title", `%${search}%`);
  }

  query = filter(query);

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []).map(({ item, ...wishlist }: any) => {
    const itemsCount = item?.[0]?.count || 0;
    const isOwner = wishlist.user_id === session.user.id;

    return {
      ...wishlist,
      items_count: itemsCount,
      itemsCount,
      can_edit: isOwner,
      is_owner: isOwner,
      access_type: null,
      owner_nickname: wishlist.owner_nickname ?? null,
    };
  });
}
