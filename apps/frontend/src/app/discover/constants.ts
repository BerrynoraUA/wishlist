import type { DiscoverTab } from "./hooks/use-discover-tab-data";

/**
 * Number of wishlist section skeletons shown while the Discover feed is
 * loading on the "wishlists" or "available" tabs.
 */
export const DISCOVER_SECTION_SKELETON_COUNT = 2;

/**
 * Tab identifiers understood by the `tab` search parameter.
 */
export const DISCOVER_TAB_PARAM = "tab";

export const DEFAULT_DISCOVER_TAB: DiscoverTab = "wishlists";

export const DISCOVER_SEARCH_PARAM = "discoverSearch";

/**
 * Tabs that render the wishlist section grid (vs. the reserved items grid).
 */
export const WISHLIST_SECTION_TABS: readonly DiscoverTab[] = ["wishlists", "available"] as const;
