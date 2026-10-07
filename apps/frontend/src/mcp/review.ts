import type { McpContext } from "./auth";
import { requireEvent, requireItem, requireWishlist } from "./access";
import { checked, ToolError } from "./results";

// Names shown on confirmation cards are resolved on the server, so the card identifies the
// actual target, not a model-supplied label. Each confirmed tool composes the ones it needs.
// Never expose raw records or gift assignments here.

export type Review = Record<string, unknown>;

export async function wishlistReview(ctx: McpContext, wishlistId: string): Promise<Review> {
  return { wishlist: (await requireWishlist(ctx, wishlistId)).title };
}

export async function wishReview(ctx: McpContext, itemId: string): Promise<Review> {
  const { item, wishlist } = await requireItem(ctx, itemId);
  return { wish: item.name, wishlist: wishlist.title };
}

export async function eventReview(ctx: McpContext, eventId: string): Promise<Review> {
  const event = await requireEvent(ctx, eventId);
  return {
    event: event.name,
    participants: (event.participants ?? []).map((person) => ({
      id: person.id,
      name: person.display_name || person.nickname,
    })),
  };
}

export async function peopleReview(ctx: McpContext, ids: string[]): Promise<Review> {
  const unique = [...new Set(ids)];
  if (!unique.length) return {};
  return { people: await checked(ctx.db.from("profiles").select("id,nickname").in("id", unique)) };
}

export async function groupReview(ctx: McpContext, groupId: string): Promise<Review> {
  const group = await checked(
    ctx.db
      .from("friend_groups")
      .select("name")
      .eq("id", groupId)
      .eq("user_id", ctx.userId)
      .maybeSingle(),
  );
  if (!group) throw new ToolError("This friend group is no longer available.");
  return { group: group.name };
}

/** The other person in a friend request the caller sent or received. */
export async function friendRequestReview(ctx: McpContext, requestId: string): Promise<Review> {
  const request = await checked(
    ctx.db
      .from("friend_requests")
      .select("sender_id,receiver_id")
      .eq("id", requestId)
      .maybeSingle(),
  );
  if (!request) throw new ToolError("This friend request is no longer available.");
  return peopleReview(ctx, [
    request.sender_id === ctx.userId ? request.receiver_id : request.sender_id,
  ]);
}

/** Who sent a Secret Santa invitation; invitees cannot read the event before accepting. */
export async function inviteReview(ctx: McpContext, inviteId: string): Promise<Review> {
  const invite = await checked(
    ctx.db.from("secret_santa_invites").select("sender_id").eq("id", inviteId).maybeSingle(),
  );
  if (!invite) throw new ToolError("This invitation is no longer available.");
  return peopleReview(ctx, [invite.sender_id]);
}
