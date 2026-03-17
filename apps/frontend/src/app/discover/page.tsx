"use client";

import { useMemo, useState } from "react";
import { DiscoverHeader } from "./components/DiscoverHeader";
import { UpcomingEvents } from "./components/UpcomingEvents";
import { DiscoverFilters } from "./components/DiscoverFilters";
import { DiscoverSection } from "./components/DiscoverSection";
import { ReservedItemsGrid } from "./components/ReservedItemsGrid";
import {
  useFriendsWishlistsDiscover,
  useFriendsWishlistsReservedByMe,
} from "@/hooks/use-wishlists";
import { useToggleItemReservation } from "@/hooks/use-items";
import { useProfilesByIds } from "@/hooks/use-settings";
import { useSubscription } from "@/hooks/use-subscription";

export default function DiscoverPage() {
  const [filter, setFilter] = useState<"wishlists" | "reserved">("wishlists");

  const {
    data: wishlistsSections = [],
    isLoading: isWishlistsLoading,
    isError: isWishlistsError,
  } = useFriendsWishlistsDiscover();

  const {
    data: reservedSections = [],
    isLoading: isReservedLoading,
    isError: isReservedError,
  } = useFriendsWishlistsReservedByMe();
  const { isPro } = useSubscription();

  const toggleReservation = useToggleItemReservation();

  const friendIds = useMemo(() => {
    return Array.from(
      new Set(
        (wishlistsSections ?? [])
          .map((s) => s.friend_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );
  }, [wishlistsSections]);

  const { data: sectionProfiles = [] } = useProfilesByIds(friendIds);

  const avatarById = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const p of sectionProfiles) {
      map.set(p.id, p.avatar_url ?? null);
    }
    return map;
  }, [sectionProfiles]);

  const isLoading = filter === "wishlists" ? isWishlistsLoading : isReservedLoading;
  const isError = filter === "wishlists" ? isWishlistsError : isReservedError;
  const hasNoData =
    !isLoading && !isError &&
    (filter === "wishlists"
      ? wishlistsSections.length === 0
      : reservedSections.length === 0);

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
      <DiscoverHeader />
      <UpcomingEvents />
      <DiscoverFilters active={filter} onChange={setFilter} />

      {isLoading && <p>Loading wishlists...</p>}
      {isError && <p>Failed to load wishlists.</p>}

      {hasNoData && (
        <p style={{ color: "#6b7280", textAlign: "center", marginTop: 32 }}>
          {filter === "reserved"
            ? "No reserved items yet."
            : "No wishlists to discover."}
        </p>
      )}

      {!isLoading && !isError && filter === "wishlists" &&
        wishlistsSections.map((section) => (
          <DiscoverSection
            key={section.id}
            {...section}
            showDiscountBadge={isPro}
            avatarUrl={
              section.avatar_url ??
              (section.friend_id
                ? (avatarById.get(section.friend_id) ?? null)
                : null)
            }
            onToggleReserve={(itemId) => toggleReservation.mutate(itemId)}
          />
        ))}

      {!isLoading && !isError && filter === "reserved" && (
        <ReservedItemsGrid
          items={reservedSections}
          showDiscountBadge={isPro}
          onToggleReserve={(itemId) => toggleReservation.mutate(itemId)}
        />
      )}
    </main>
  );
}
