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
