const FRIEND_INVITE_PATTERN =
  /[?&]friendInvite=([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/;

/**
 * Rewrites incoming deep links before expo-router resolves them.
 *
 * Friend invite links (`wishlane://home?friendInvite=<userId>`) mirror the web URL, but the app
 * has no `/home` route: unrewritten, the link fell through to not-found and landed on
 * Wishlists. Send it to Friends, which opens the invite sheet from the param.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  const invite = path.match(FRIEND_INVITE_PATTERN)?.[1];
  if (invite) return `/friends?friendInvite=${invite}`;

  return path;
}
