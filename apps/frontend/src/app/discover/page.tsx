"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DiscoverHeader } from "./components/DiscoverHeader";
import { UpcomingEvents } from "./components/UpcomingEvents";
import { DiscoverFilters } from "./components/DiscoverFilters";
import { DiscoverSection } from "./components/DiscoverSection";
import { ReservedItemsGrid } from "./components/ReservedItemsGrid";
import {
  useFriendsWishlistsDiscover,
  useFriendsWishlistsPurchasedByMe,
  useFriendsWishlistsReservedByMe,
} from "@/hooks/use-wishlists";
import { useToggleItemBought, useToggleItemReservation } from "@/hooks/use-items";
import { useProfilesByIds } from "@/hooks/use-settings";
import { useSubscription } from "@/hooks/use-subscription";

function DiscoverPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tabFromUrl: "wishlists" | "reserved" | "purchased" =
    tabParam === "reserved" || tabParam === "purchased"
      ? tabParam
      : "wishlists";
  const [filter, setFilter] = useState<"wishlists" | "reserved" | "purchased">(tabFromUrl);
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

  useEffect(() => {
    setFilter(tabFromUrl);
  }, [tabFromUrl]);

  useEffect(() => {
    if (filter === tabFromUrl) return;

    const params = new URLSearchParams(searchParams.toString());
    if (filter === "wishlists") {
      params.delete("tab");
    } else {
      params.set("tab", filter);
    }

    router.replace(
      params.toString() ? `${pathname}?${params.toString()}` : pathname,
      { scroll: false },
    );
  }, [filter, tabFromUrl, pathname, router, searchParams]);

  const {
    data: wishlistsSections = [],
    isLoading: isWishlistsLoading,
    isError: isWishlistsError,
  } = useFriendsWishlistsDiscover(
    { search: wishlistsSearch },
    filter === "wishlists",
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
  const { isPro } = useSubscription();

  const toggleReservation = useToggleItemReservation();
  const toggleBought = useToggleItemBought();

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

  const isLoading =
    filter === "wishlists"
      ? isWishlistsLoading
      : filter === "reserved"
        ? isReservedLoading
        : isPurchasedLoading;
  const isError =
    filter === "wishlists"
      ? isWishlistsError
      : filter === "reserved"
        ? isReservedError
        : isPurchasedError;
  const hasNoData =
    !isLoading && !isError &&
    (filter === "wishlists"
      ? wishlistsSections.length === 0
      : filter === "reserved"
        ? reservedSections.length === 0
        : purchasedSections.length === 0);

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
            : filter === "purchased"
              ? "No purchased items yet."
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
            onToggleBought={(itemId) => toggleBought.mutate(itemId)}
          />
        ))}

      {!isLoading && !isError && filter === "reserved" && (
        <ReservedItemsGrid
          items={reservedSections}
          mode="reserved"
          showDiscountBadge={isPro}
          onToggleReserve={(itemId) => toggleReservation.mutate(itemId)}
          onToggleBought={(itemId) => toggleBought.mutate(itemId)}
        />
      )}

      {!isLoading && !isError && filter === "purchased" && (
        <ReservedItemsGrid
          items={purchasedSections}
          mode="purchased"
          showDiscountBadge={isPro}
          onToggleReserve={(itemId) => toggleReservation.mutate(itemId)}
          onToggleBought={(itemId) => toggleBought.mutate(itemId)}
        />
      )}
    </main>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}><p>Loading discover...</p></main>}>
      <DiscoverPageContent />
    </Suspense>
  );
}
