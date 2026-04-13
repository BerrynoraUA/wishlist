"use client";

import { useMemo } from "react";
import { useGT } from "gt-next";
import { WishlistVisibility } from "@/types/wishlist";

export function useWishlistVisibilityLabels(): Record<WishlistVisibility, string> {
  const t = useGT();
  return useMemo(
    () => ({
      [WishlistVisibility.Public]: t("Public", {
        $id: "wishlist.visibility.public",
        $context: "wishlist visibility option",
      }),
      [WishlistVisibility.FriendsOnly]: t("Friends only", {
        $id: "wishlist.visibility.friendsOnly",
        $context: "wishlist visibility option",
      }),
      [WishlistVisibility.Private]: t("Private", {
        $id: "wishlist.visibility.private",
        $context: "wishlist visibility option",
      }),
    }),
    [t],
  );
}
