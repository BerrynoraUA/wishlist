import { supabase } from "@/lib/supabase";
import type { Item } from "@/types/item";
import type { PaginationParams } from "@/types";

export async function getItems(
  queryModifier?: (query: any) => any,
  params: PaginationParams = {}
): Promise<Item[]> {
  const { skip = 0, take = 50 } = params;
  const from = skip;
  const to = skip + take - 1;

  let query = supabase
    .from("item")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (queryModifier) {
    query = queryModifier(query);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}
