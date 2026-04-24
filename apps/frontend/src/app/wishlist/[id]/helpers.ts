/**
 * Build the base URL used when creating a wishlist share link. Returns an
 * empty string when called in an SSR context where `window` is unavailable;
 * the share API will fall back to a server-side default in that case.
 */
export function getShareBaseUrl(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/share`;
}
