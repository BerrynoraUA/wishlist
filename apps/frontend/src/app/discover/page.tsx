"use client";

import { Suspense, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useGT } from "gt-next";
import { DiscoverHeader } from "./components/DiscoverHeader";
import { UpcomingEvents } from "./components/UpcomingEvents";
import { DiscoverFilters } from "./components/DiscoverFilters";
import { DiscoverSection } from "./components/DiscoverSection";
import { ReservedItemsGrid } from "./components/ReservedItemsGrid";
import {
  useFriendsWishlistsDiscover,
  useFriendsWishlistsDiscoverAll,
  useFriendsWishlistsPurchasedByMe,
  useFriendsWishlistsReservedByMe,
} from "@/hooks/use-wishlists";
import {
  useToggleItemBought,
  useToggleItemReservation,
} from "@/hooks/use-items";
import { useProfilesByIds } from "@/hooks/use-settings";
import { useFriends } from "@/hooks/use-friends";

function DiscoverPageContent() {
  const t = useGT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tabFromUrl: "wishlists" | "available" | "reserved" | "purchased" =
    tabParam === "available" ||
    tabParam === "reserved" ||
    tabParam === "purchased"
      ? tabParam
      : "wishlists";
  const filter = tabFromUrl;
  const wishlistsSearch = useMemo(
    () => searchParams.get("discoverSearch") ?? "",
    [searchParams],
  );
  const reservedSearch = useMemo(
    () => searchParams.get("reservedSearch") ?? "",
    [searchParams],
  );
  const purchasedSearch = useMemo(
    () => searchParams.get("purchasedSearch") ?? "",
    [searchParams],
  );

  const handleFilterChange = useCallback(
    (nextFilter: "wishlists" | "available" | "reserved" | "purchased") => {
      if (nextFilter === filter) return;

      const params = new URLSearchParams(searchParams.toString());
      if (nextFilter === "wishlists") {
        params.delete("tab");
      } else {
        params.set("tab", nextFilter);
      }

      router.replace(
        params.toString() ? `${pathname}?${params.toString()}` : pathname,
        {
          scroll: false,
        },
      );
    },
    [filter, pathname, router, searchParams],
  );

  const {
    data: allWishlistsSections = [],
    isLoading: isAllWishlistsLoading,
    isError: isAllWishlistsError,
  } = useFriendsWishlistsDiscoverAll(
    { search: wishlistsSearch },
    filter === "wishlists",
  );

  const {
    data: wishlistsSections = [],
    isLoading: isWishlistsLoading,
    isError: isWishlistsError,
  } = useFriendsWishlistsDiscover(
    { search: wishlistsSearch },
    filter === "available",
  );

  const {
    data: reservedSections = [],
    isLoading: isReservedLoading,
    isError: isReservedError,
  } = useFriendsWishlistsReservedByMe(
    { search: reservedSearch },
    filter === "reserved",
  );

  const {
    data: purchasedSections = [],
    isLoading: isPurchasedLoading,
    isError: isPurchasedError,
  } = useFriendsWishlistsPurchasedByMe(
    { search: purchasedSearch },
    filter === "purchased",
  );

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

  const activeWishlistSections =
    filter === "wishlists" ? allWishlistsSections : wishlistsSections;

  const friendIds = useMemo(() => {
    return Array.from(
      new Set(
        (activeWishlistSections ?? [])
          .map((s) => s.friend_id ?? nicknameToFriendId.get(s.username))
          .filter((id): id is string => Boolean(id)),
      ),
    );
  }, [activeWishlistSections, nicknameToFriendId]);

  const { data: sectionProfiles = [] } = useProfilesByIds(friendIds);

  const avatarById = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const p of sectionProfiles) {
      map.set(p.id, p.avatar_url ?? null);
    }
    return map;
  }, [sectionProfiles]);

  const isLoading =
    filter === "wishlists"
      ? isAllWishlistsLoading
      : filter === "available"
        ? isWishlistsLoading
        : filter === "reserved"
          ? isReservedLoading
          : isPurchasedLoading;
  const isError =
    filter === "wishlists"
      ? isAllWishlistsError
      : filter === "available"
        ? isWishlistsError
        : filter === "reserved"
          ? isReservedError
          : isPurchasedError;
  const hasNoData =
    !isLoading &&
    !isError &&
    (filter === "wishlists" || filter === "available"
      ? activeWishlistSections.length === 0
      : filter === "reserved"
        ? reservedSections.length === 0
        : purchasedSections.length === 0);

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>
      <DiscoverHeader />
      <UpcomingEvents />
      <DiscoverFilters active={filter} onChange={handleFilterChange} />

      {isError && (
        <p>
          {t("Failed to load wishlists.", {
            $id: "discover.page.loadError",
          })}
        </p>
      )}

      {hasNoData && (
        <p style={{ color: "#6b7280", textAlign: "center", marginTop: 32 }}>
          {filter === "reserved"
            ? t("No reserved items yet.", {
                $id: "discover.page.emptyReserved",
              })
            : filter === "purchased"
              ? t("No purchased items yet.", {
                  $id: "discover.page.emptyPurchased",
                })
              : filter === "available"
                ? t("No available wishlists to discover.", {
                    $id: "discover.page.emptyAvailable",
                  })
                : t("No wishlists to discover.", {
                    $id: "discover.page.emptyWishlists",
                  })}
        </p>
      )}

      {!isLoading &&
        !isError &&
        (filter === "wishlists" || filter === "available") &&
        activeWishlistSections.map((section) => (
          <DiscoverSection
            key={section.id}
            {...section}
            friend_id={
              section.friend_id ?? nicknameToFriendId.get(section.username)
            }
            showDiscountBadge={true}
            avatarUrl={
              section.avatar_url ??
              ((section.friend_id ?? nicknameToFriendId.get(section.username))
                ? (avatarById.get(
                    section.friend_id ??
                      nicknameToFriendId.get(section.username) ??
                      "",
                  ) ?? null)
                : null)
            }
            onToggleReserve={(itemId) => toggleReservation.mutate(itemId)}
            onToggleBought={(itemId) => toggleBought.mutate(itemId)}
          />
        ))}

      {!isLoading && !isError && filter === "reserved" && (
        <ReservedItemsGrid
          items={reservedSections}
          mode="reserved"
          showDiscountBadge={true}
          onToggleReserve={(itemId) => toggleReservation.mutate(itemId)}
          onToggleBought={(itemId) => toggleBought.mutate(itemId)}
        />
      )}

      {!isLoading && !isError && filter === "purchased" && (
        <ReservedItemsGrid
          items={purchasedSections}
          mode="purchased"
          showDiscountBadge={true}
          onToggleReserve={(itemId) => toggleReservation.mutate(itemId)}
          onToggleBought={(itemId) => toggleBought.mutate(itemId)}
        />
      )}
    </main>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={null}>
      <DiscoverPageContent />
    </Suspense>
  );
}
