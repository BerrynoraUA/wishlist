/**
 * Number of skeleton cards to show while friends list is loading.
 */
export const FRIENDS_SKELETON_COUNT = 6;

/**
 * Number of skeleton cards to show while incoming/outgoing request lists
 * are loading.
 */
export const REQUESTS_SKELETON_COUNT = 4;

/**
 * Responsive grid style shared by every tab pane on the Friends page.
 */
export const FRIENDS_GRID_STYLE = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: 16,
} as const;

export type FriendsTab = "friends" | "groups" | "requests" | "sent" | "blocked";

export const DEFAULT_FRIENDS_TAB: FriendsTab = "friends";

export const FRIENDS_SEARCH_PARAM = "search";
