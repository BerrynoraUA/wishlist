const UUID_PATTERN =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}";
const ALLOWED_NOTIFICATION_ROUTES = [
  /^\/friends$/,
  /^\/secret-santa$/,
  /^\/wishlists$/,
  new RegExp(`^/wishlists/${UUID_PATTERN}$`),
];

export function getSafeNotificationRoute(value: unknown) {
  if (typeof value !== "string") return null;
  return ALLOWED_NOTIFICATION_ROUTES.some((pattern) => pattern.test(value)) ? value : null;
}
