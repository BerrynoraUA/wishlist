import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export class ToolError extends Error {}

export async function checked<T>(query: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await query;
  if (error)
    throw new ToolError(
      "Wishlane could not complete this operation. Check that the record still exists and you have permission. Refresh before retrying a change.",
    );
  return data;
}

/**
 * Applies a per-record change in order. Validate every record first; if one still fails, the
 * error says how many were already changed so nobody assumes nothing happened.
 */
export async function applyEach(ids: string[], apply: (id: string) => Promise<unknown>) {
  for (const [done, id] of ids.entries()) {
    try {
      await apply(id);
    } catch (error) {
      if (!done) throw error;
      throw new ToolError(
        `Stopped after ${done} of ${ids.length} changes. Refresh the data before retrying the rest.`,
      );
    }
  }
}

/** "1 item", "3 items". */
export function count(n: number, singular: string, plural = `${singular}s`) {
  return `${n} ${n === 1 ? singular : plural}`;
}

export function result(data: Record<string, unknown>): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: data };
}

// Only fields needed by the gifting tools leave the server; never return raw rows.
// `ownerId` is null when the list owner is unknown, which is never the caller.
export function safeItem(row: Record<string, unknown>, userId: string, ownerId: string | null) {
  const fields = [
    "id",
    "wishlist_id",
    "wishlist_title",
    "name",
    "description",
    "price",
    "currency",
    "priority_id",
    "priority_name",
    "image_url",
    "url",
    "discount_price",
    "has_discount",
    "discount_end_date",
    "additional_links",
    "color_index",
    "created_at",
  ];
  const item: Record<string, unknown> = Object.fromEntries(
    fields.filter((key) => row[key] !== undefined).map((key) => [key, row[key]]),
  );
  const mine = row.reserved_by === userId;
  // Preserve surprises for owners; other shoppers need availability, never the giver's identity.
  if (ownerId !== userId || mine || row.status === 0) item.status = row.status;
  item.reserved_by_me = mine && row.status === 1;
  item.bought_by_me = mine && row.status === 2;
  return item;
}
