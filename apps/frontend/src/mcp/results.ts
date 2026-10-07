import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ALL_PRIORITIES } from "@/lib/priorities";

export class ToolError extends Error {}

const FAILED =
  "Wishlane could not complete this operation. Check that the record still exists and you have permission. Refresh before retrying a change.";

/** Says what went wrong when Postgres knows, so the assistant fixes the request instead of retrying it. */
export function errorMessage(error: unknown) {
  const { code, message } = (error ?? {}) as { code?: unknown; message?: unknown };
  switch (code) {
    // Raised by Wishlane's own functions and triggers, e.g. the three-star limit.
    case "P0001":
      return typeof message === "string" && message ? message.slice(0, 300) : FAILED;
    case "23505":
      return "This already exists, for example a duplicate friend request, invitation or access grant. Refresh to see the current state.";
    case "23503":
      return "A record this change refers to no longer exists. Refresh and use current IDs.";
    case "23514":
    case "22P02":
      return "One of the values is not allowed. Check the input and try again.";
    case "42501":
      return "You do not have permission to make this change.";
    case "PGRST116":
      return "This record was not found or you no longer have access to it.";
    default:
      return FAILED;
  }
}

export async function checked<T>(query: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await query;
  if (error) throw new ToolError(errorMessage(error));
  return data;
}

/**
 * Callers fetch one row past the page, so the result can say whether another page exists.
 * Without has_more, a full page reads like the complete list.
 */
export function paged<T = Record<string, unknown>>(
  rows: unknown,
  page: { offset: number; limit: number },
) {
  const all = (rows as T[] | null) ?? [];
  return {
    rows: all.slice(0, page.limit),
    page: { offset: page.offset, limit: page.limit, has_more: all.length > page.limit },
  };
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
  const priority = ALL_PRIORITIES.find(({ id }) => id === row.priority_id);
  if (priority) item.priority = priority.name.toLowerCase();
  const mine = row.reserved_by === userId;
  // Preserve surprises for owners; other shoppers need availability, never the giver's identity.
  if (ownerId !== userId || mine || row.status === 0) item.status = row.status;
  item.reserved_by_me = mine && row.status === 1;
  item.bought_by_me = mine && row.status === 2;
  return item;
}
