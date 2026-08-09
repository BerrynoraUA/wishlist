import { hashKey } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { wishlistKeys } from "./wishlist-query-keys";

describe("wishlist query keys", () => {
  it("keeps finite and infinite personal-wishlist payloads in separate caches", () => {
    expect(
      hashKey(
        wishlistKeys.my("user-1", {
          skip: undefined,
          take: 20,
          search: undefined,
        }),
      ),
    ).not.toBe(
      hashKey(
        wishlistKeys.infiniteMy("user-1", {
          take: 20,
          search: undefined,
        }),
      ),
    );
  });
});
