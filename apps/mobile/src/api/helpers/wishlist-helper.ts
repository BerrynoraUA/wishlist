import { supabase } from "@/lib/supabase";
import type { Wishlist } from "@/types/wishlist";
import type { PaginationParams } from "@/types";

export async function getWishlists(
  filter: (query: any) => any,
  { skip = 0, take = 10, search }: PaginationParams = {}
): Promise<Wishlist[]> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.user) throw new Error("Not authenticated");

  let query = supabase
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

  return (data ?? []).map(({ item, ...wishlist }: any) => ({
    ...wishlist,
    itemsCount: item?.[0]?.count || 0,
  }));
}
