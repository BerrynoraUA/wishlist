import type { ItemQueryParams } from "@wishlist/backend/types/item";

export const itemKeys = {
  all: ["items"] as const,
  wishlist: (authUserId: string | null | undefined, wishlistId: string, params?: ItemQueryParams) =>
    [...itemKeys.all, "wishlist", authUserId ?? "anonymous", wishlistId, params] as const,
  votes: (authUserId: string | null | undefined, itemIds: string[]) =>
    [...itemKeys.all, "votes", authUserId ?? "anonymous", ...itemIds.sort()] as const,
};
