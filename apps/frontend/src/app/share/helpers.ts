import { SHARE_QUERY_PARAMS } from "./constants";

/**
 * Parse the `?page` query param, defaulting to 1 for missing or invalid
 * values.
 */
export function parsePageParam(raw: string | null): number {
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * Build a `/wishlist/{id}` URL with optional `item` and `page` query params.
 * Pure; no navigation side effects.
 */
export function buildWishlistDestinationUrl(
  wishlistId: string,
  itemId: string | null,
  page: number,
): string {
  const destination = new URLSearchParams();
  if (itemId) destination.set(SHARE_QUERY_PARAMS.ITEM, itemId);
  if (page > 1) destination.set(SHARE_QUERY_PARAMS.PAGE, String(page));
  return destination.size > 0
    ? `/wishlist/${wishlistId}?${destination.toString()}`
    : `/wishlist/${wishlistId}`;
}

/**
 * Return the `/share` URL with the `action` param stripped out.
 */
export function buildShareCleanupUrl(searchParams: URLSearchParams): string {
  const params = new URLSearchParams(searchParams.toString());
  params.delete(SHARE_QUERY_PARAMS.ACTION);
  return `/share?${params.toString()}`;
}
