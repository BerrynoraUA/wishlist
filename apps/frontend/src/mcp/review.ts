import type { McpContext } from "./auth";
import { requireEvent, requireItem, requireItems, requireWishlist } from "./access";
import { checked, ToolError } from "./results";

// Names shown on confirmation cards are resolved on the server, so the card identifies the
// actual target, not a model-supplied label. Each confirmed tool composes the ones it needs.
// Never expose raw records or gift assignments here.

export type Review = Record<string, unknown>;

/** A single selection reads naturally on the card: "Item: Mug", not "Items: Mug". */
export function named(singular: string, plural: string, names: unknown[]): Review {
  return names.length === 1 ? { [singular]: names[0] } : { [plural]: names };
}

export async function wishlistReview(ctx: McpContext, wishlistId: string): Promise<Review> {
  return { wishlist: (await requireWishlist(ctx, wishlistId)).title };
}

export async function wishReview(ctx: McpContext, itemId: string): Promise<Review> {
  const { item, wishlist } = await requireItem(ctx, itemId);
  return { wish: item.name, wishlist: wishlist.title };
}

export async function wishlistsReview(ctx: McpContext, wishlistIds: string[]): Promise<Review> {
  const lists = await Promise.all(
    wishlistIds.map((wishlistId) => requireWishlist(ctx, wishlistId)),
  );
  return named(
    "wishlist",
    "wishlists",
    lists.map((list) => list.title),
  );
}

export async function wishesReview(ctx: McpContext, itemIds: string[]): Promise<Review> {
  const found = await requireItems(ctx, itemIds);
  return {
    ...named(
      "wish",
      "wishes",
      found.map(({ item }) => item.name),
    ),
    ...named("wishlist", "wishlists", [...new Set(found.map(({ wishlist }) => wishlist.title))]),
  };
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

export async function eventsReview(ctx: McpContext, eventIds: string[]): Promise<Review> {
  const events = await Promise.all(eventIds.map((eventId) => requireEvent(ctx, eventId)));
  return named(
    "event",
    "events",
    events.map((event) => event.name),
  );
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

/** Throws unless every group still exists and belongs to the caller. */
export async function groupsReview(ctx: McpContext, groupIds: string[]): Promise<Review> {
  const groups =
    (await checked(
      ctx.db.from("friend_groups").select("id,name").in("id", groupIds).eq("user_id", ctx.userId),
    )) ?? [];
  if (groups.length !== groupIds.length)
    throw new ToolError("Some of these friend groups are no longer available.");
  return named(
    "group",
    "groups",
    groupIds.map((groupId) => groups.find((group) => group.id === groupId)!.name),
  );
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
