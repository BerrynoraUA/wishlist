import type { McpContext } from "./auth";
import { checked, ToolError } from "./results";

// Resolve names on the server so confirmation cards identify the actual target,
// not a model-supplied label. Do not expose raw records or gift assignments.
export async function reviewContext(ctx: McpContext, input: Record<string, unknown>) {
  const summary: Record<string, unknown> = {};
  if (typeof input.wishlist_id === "string") {
    const list = await checked(
      ctx.db.rpc("get_wishlist_by_id", { p_wishlist_id: input.wishlist_id }),
    );
    summary.wishlist = list.title;
  }
  if (typeof input.item_id === "string") {
    const item = await checked(
      ctx.db.from("item").select("name,wishlist_id").eq("id", input.item_id).single(),
    );
    if (!item) throw new ToolError("This wish is no longer available.");
    summary.wish = item.name;
  }
  if (typeof input.event_id === "string") {
    const event = await checked(
      ctx.db.rpc("get_secret_santa_details", { p_event_id: input.event_id }),
    );
    summary.event = event.name;
    summary.participants = (event.participants ?? []).map(
      (person: { id: string; display_name: string; nickname: string }) => ({
        id: person.id,
        name: person.display_name || person.nickname,
      }),
    );
  }
  const people = [
    input.receiver_id,
    input.user_id,
    ...(Array.isArray(input.member_ids) ? input.member_ids : []),
    ...(Array.isArray(input.invited_user_ids) ? input.invited_user_ids : []),
  ];
  if (input.target === "user") people.push(input.target_id);
  const ids = [...new Set(people.filter((value): value is string => typeof value === "string"))];
  if (ids.length)
    summary.people = await checked(ctx.db.from("profiles").select("id,nickname").in("id", ids));
  return summary;
}

export function sameParticipants(first: Record<string, unknown>, second: Record<string, unknown>) {
  const ids = (value: unknown) =>
    Array.isArray(value) ? value.map((person) => person.id).sort() : [];
  return JSON.stringify(ids(first.participants)) === JSON.stringify(ids(second.participants));
}
