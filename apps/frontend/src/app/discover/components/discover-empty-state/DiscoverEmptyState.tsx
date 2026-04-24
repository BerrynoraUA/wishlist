"use client";

import { useGT } from "gt-next";
import type { DiscoverTab } from "../../hooks/use-discover-tab-data";

const STYLE = { color: "#6b7280", textAlign: "center" as const, marginTop: 32 };

/**
 * Renders the tab-specific "nothing to show" message for the Discover feed.
 * Keeps translation keys and wording in one place instead of a nested ternary.
 */
export function DiscoverEmptyState({ filter }: { filter: DiscoverTab }) {
  const t = useGT();

  const messages: Record<DiscoverTab, string> = {
    wishlists: t("No wishlists to discover.", {
      $id: "discover.page.emptyWishlists",
    }),
    available: t("No available wishlists to discover.", {
      $id: "discover.page.emptyAvailable",
    }),
    reserved: t("No reserved items yet.", {
      $id: "discover.page.emptyReserved",
    }),
    purchased: t("No purchased items yet.", {
      $id: "discover.page.emptyPurchased",
    }),
  };

  return <p style={STYLE}>{messages[filter]}</p>;
}
