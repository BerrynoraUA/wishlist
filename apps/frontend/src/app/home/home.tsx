import { GREETING_FALLBACK_NAME, HOME_QUERY_PARAMS } from "./constants";

type NameSource = {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

/**
 * Derive a human-friendly display name from a Supabase user-like object.
 *
 * Priority:
 * 1. user_metadata.full_name or user_metadata.name
 * 2. user_metadata.first_name + user_metadata.last_name
 * 3. local-part of email
 * 4. GREETING_FALLBACK_NAME ("there")
 */
export function getDisplayName(nameSource?: NameSource): string {
  const metadata = (nameSource?.user_metadata ?? {}) as Record<string, unknown>;

  const rawFull = metadata.full_name ?? metadata.name;
  const rawFirst = metadata.first_name;
  const rawLast = metadata.last_name;

  const fullName =
    (typeof rawFull === "string" && rawFull) ||
    [
      typeof rawFirst === "string" ? rawFirst : undefined,
      typeof rawLast === "string" ? rawLast : undefined,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  if (fullName) return fullName;
  if (nameSource?.email) return nameSource.email.split("@")[0];
  return GREETING_FALLBACK_NAME;
}

/**
 * Pure reader for the `friendInvite` query parameter.
 */
export function getInitialInvite(searchParams: URLSearchParams): string {
  return searchParams.get(HOME_QUERY_PARAMS.FRIEND_INVITE) ?? "";
}

/**
 * Pure predicate for the `friendRequestSent=1` query parameter.
 */
export function getInitialFriendRequestSent(searchParams: URLSearchParams, flag: string): boolean {
  return searchParams.get(HOME_QUERY_PARAMS.FRIEND_REQUEST_SENT) === flag;
}

/**
 * Remove the home-specific friend-invite / request-sent params from a
 * URLSearchParams-like object and return the resulting `/home` URL
 * (with `?query` only when non-empty). Pure; no navigation side effects.
 */
export function buildHomeCleanupUrl(searchParams: URLSearchParams): string {
  const params = new URLSearchParams(searchParams.toString());
  params.delete(HOME_QUERY_PARAMS.FRIEND_INVITE);
  params.delete(HOME_QUERY_PARAMS.FRIEND_REQUEST_SENT);
  const next = params.toString();
  return next ? `/home?${next}` : "/home";
}
