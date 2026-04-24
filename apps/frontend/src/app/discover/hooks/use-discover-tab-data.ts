"use client";

import type { DiscoverSection, ReservedItem } from "@/api/types/wishilst";
import {
  useFriendsWishlistsDiscover,
  useFriendsWishlistsDiscoverAll,
  useFriendsWishlistsPurchasedByMe,
  useFriendsWishlistsReservedByMe,
} from "@/hooks/use-wishlists";

export type DiscoverTab = "wishlists" | "available" | "reserved" | "purchased";

type UseDiscoverTabDataResult = {
  activeWishlistSections: DiscoverSection[];
  activeReservedItems: ReservedItem[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
};

export function useDiscoverTabData(
  params: PaginationParams,
  filter: DiscoverTab,
): UseDiscoverTabDataResult {
  const {
    data: allWishlistsSections = [],
    isLoading: isAllWishlistsLoading,
    isFetching: isAllWishlistsFetching,
    isError: isAllWishlistsError,
  } = useFriendsWishlistsDiscoverAll(params, filter === "wishlists");

  const {
    data: wishlistsSections = [],
    isLoading: isWishlistsLoading,
    isFetching: isWishlistsFetching,
    isError: isWishlistsError,
  } = useFriendsWishlistsDiscover(params, filter === "available");

  const {
    data: reservedSections = [],
    isLoading: isReservedLoading,
    isFetching: isReservedFetching,
    isError: isReservedError,
  } = useFriendsWishlistsReservedByMe(params, filter === "reserved");

  const {
    data: purchasedSections = [],
    isLoading: isPurchasedLoading,
    isFetching: isPurchasedFetching,
    isError: isPurchasedError,
  } = useFriendsWishlistsPurchasedByMe(params, filter === "purchased");

  return {
    activeWishlistSections: filter === "wishlists" ? allWishlistsSections : wishlistsSections,
    activeReservedItems: filter === "reserved" ? reservedSections : purchasedSections,
    isLoading:
      filter === "wishlists"
        ? isAllWishlistsLoading
        : filter === "available"
          ? isWishlistsLoading
          : filter === "reserved"
            ? isReservedLoading
            : isPurchasedLoading,
    isFetching:
      filter === "wishlists"
        ? isAllWishlistsFetching
        : filter === "available"
          ? isWishlistsFetching
          : filter === "reserved"
            ? isReservedFetching
            : isPurchasedFetching,
    isError:
      filter === "wishlists"
        ? isAllWishlistsError
        : filter === "available"
          ? isWishlistsError
          : filter === "reserved"
            ? isReservedError
            : isPurchasedError,
  };
}
