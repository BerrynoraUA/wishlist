/**
 * Home page URL query parameters.
 *
 * `friendInvite` — opens the FriendInviteModal with the given user id.
 * `friendRequestSent` — opens the FriendRequestSentModal (flag "1").
 */
export const HOME_QUERY_PARAMS = {
  FRIEND_INVITE: "friendInvite",
  FRIEND_REQUEST_SENT: "friendRequestSent",
} as const;

export const FRIEND_REQUEST_SENT_FLAG = "1";

/**
 * Page size for the wishlist grid on the home page.
 */
export const WISHLIST_PAGE_SIZE = 8;

/**
 * Fallback display name used when the authenticated user has neither a full
 * name nor an email-derived handle. Localized at render time.
 */
export const GREETING_FALLBACK_NAME = "there";
