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

/**
 * Centres an empty pane's mascot in the space the cards would have filled. Without it the
 * grid squeezes the mascot into the first column and it sits in the top-left corner.
 */
export const FRIENDS_EMPTY_STATE_STYLE = {
  gridColumn: "1 / -1",
  minHeight: "min(46vh, 420px)",
  display: "grid",
  placeItems: "center",
} as const;
