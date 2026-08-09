import { hashKey } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { itemKeys } from "./item-query-keys";

describe("item query keys", () => {
  it("keeps finite and infinite wishlist-item payloads in separate caches", () => {
    expect(
      hashKey(
        itemKeys.wishlist("user-1", "wishlist-1", {
          skip: undefined,
          take: 20,
          search: undefined,
        }),
      ),
    ).not.toBe(
      hashKey(
        itemKeys.infiniteWishlist("user-1", "wishlist-1", {
          take: 20,
          search: undefined,
        }),
      ),
    );
  });
});
