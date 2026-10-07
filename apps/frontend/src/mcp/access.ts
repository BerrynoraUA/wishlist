import type { SecretSantaDetails } from "@wishlist/backend/types/secret-santa";
import type { McpContext } from "./auth";
import { checked, ToolError } from "./results";

// Load a record and check the caller's access level before any tool touches it.

export async function requireWishlist(
  ctx: McpContext,
  wishlistId: string,
  access: "view" | "edit" | "own" = "view",
) {
  const list = await checked(ctx.db.rpc("get_wishlist_by_id", { p_wishlist_id: wishlistId }));
  const allowed =
    list &&
    (access === "view" ||
      (access === "edit" && list.can_edit) ||
      (access === "own" && list.user_id === ctx.userId));
  if (!allowed) throw new ToolError("You do not have permission to change this wishlist.");
  return list;
}

export async function requireItem(
  ctx: McpContext,
  itemId: string,
  access: "view" | "edit" = "view",
) {
  const item = await checked(ctx.db.from("item").select("*").eq("id", itemId).single());
  const wishlist = await requireWishlist(ctx, item.wishlist_id, access);
  return { item, wishlist };
}

/** Loads several wishes at once, checking each wishlist only once. */
export async function requireItems(
  ctx: McpContext,
  itemIds: string[],
  access: "view" | "edit" = "view",
) {
  const items = (await checked(ctx.db.from("item").select("*").in("id", itemIds))) ?? [];
  if (items.length !== itemIds.length)
    throw new ToolError("Some of these wishes are no longer available. Refresh and try again.");
  const wishlistIds = [...new Set(items.map((item) => item.wishlist_id))];
  const wishlists = new Map(
    await Promise.all(
      wishlistIds.map(
        async (wishlistId) => [wishlistId, await requireWishlist(ctx, wishlistId, access)] as const,
      ),
    ),
  );
  // Keep the caller's order so the review lists wishes as the user asked for them.
  return itemIds.map((itemId) => {
    const item = items.find((row) => row.id === itemId)!;
    return { item, wishlist: wishlists.get(item.wishlist_id)! };
  });
}

export async function requireEvent(
  ctx: McpContext,
  eventId: string,
  access: "view" | "own" = "view",
): Promise<SecretSantaDetails> {
  const event: SecretSantaDetails | null = await checked(
    ctx.db.rpc("get_secret_santa_details", { p_event_id: eventId }),
  );
  if (!event || (access === "own" && event.owner_id !== ctx.userId))
    throw new ToolError("You do not have permission to change this Secret Santa event.");
  return event;
}
