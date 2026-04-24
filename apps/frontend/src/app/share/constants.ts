/**
 * Page size for the items grid on the public share page.
 */
export const SHARE_PAGE_SIZE = 12;

/**
 * Query parameter names used by the share flow.
 */
export const SHARE_QUERY_PARAMS = {
  TOKEN: "token",
  ACTION: "action",
  ITEM: "item",
  PAGE: "page",
} as const;

/**
 * Value of `action` indicating the user just returned from login wanting to
 * reserve an item.
 */
export const SHARE_RESERVE_ACTION = "reserve";
