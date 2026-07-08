export function isWishlistDetailPath(pathname: string): boolean {
  return pathname.startsWith("/wishlists/") && pathname !== "/wishlists/discover";
}
