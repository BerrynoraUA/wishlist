"use client";

import { useMemo } from "react";
import { useFriends } from "@/hooks/use-friends";
import { useProfilesByIds } from "@/hooks/use-settings";
import { useToggleItemBought, useToggleItemReservation } from "@/hooks/use-items";
import { useDiscoverFilters } from "./use-discover-filters";
import { useDiscoverTabData, type DiscoverTab } from "./use-discover-tab-data";
import { WISHLIST_SECTION_TABS } from "../constants";

/**
 * Combines the Discover filter state, server data, and friend-profile
 * enrichment (nickname→id map, avatar lookup) into a single hook the page
 * shell consumes. Also exposes the derived `hasNoData` flag so the view
 * layer stays declarative.
 */
export function useDiscoverPage() {
  const filters = useDiscoverFilters();

  const tabData = useDiscoverTabData(filters.serverParams, filters.filter);

  const toggleReservation = useToggleItemReservation();
  const toggleBought = useToggleItemBought();

  const { data: friendsList = [] } = useFriends();
  const nicknameToFriendId = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of friendsList) {
      if (f.nickname) map.set(f.nickname, f.friend_id);
    }
    return map;
  }, [friendsList]);

  const friendIds = useMemo(() => {
    return Array.from(
      new Set(
        (tabData.activeWishlistSections ?? [])
          .map((s) => s.friend_id ?? nicknameToFriendId.get(s.username))
          .filter((id): id is string => Boolean(id)),
      ),
    );
  }, [tabData.activeWishlistSections, nicknameToFriendId]);

  const { data: sectionProfiles = [] } = useProfilesByIds(friendIds);

  const avatarById = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const p of sectionProfiles) {
      map.set(p.id, p.avatar_url ?? null);
    }
    return map;
  }, [sectionProfiles]);

  const isSectionTab = (WISHLIST_SECTION_TABS as readonly DiscoverTab[]).includes(filters.filter);

  const hasNoData =
    !tabData.isLoading &&
    !tabData.isError &&
    (isSectionTab
      ? tabData.activeWishlistSections.length === 0
      : tabData.activeReservedItems.length === 0);

  return {
    filters,
    tabData,
    toggleReservation,
    toggleBought,
    nicknameToFriendId,
    avatarById,
    isSectionTab,
    hasNoData,
  };
}
