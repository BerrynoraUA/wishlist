import { getSupabasePublicEnv } from "../supabase/shared";

/**
 * Ten flat person illustrations stored in the public `avatars` bucket under
 * `defaults/`. A profile with no picture is given one at random the first time
 * an app loads it, and the profile screens let the user swap to any of the
 * others instead of uploading a photo.
 *
 * They are ordinary public storage URLs, so every place that renders
 * `avatar_url` shows them without knowing they are defaults. The files
 * themselves are uploaded to each environment's bucket by hand; changing the
 * count or the naming here means uploading a matching set there.
 */
export const DEFAULT_AVATAR_COUNT = 10;

export function getDefaultAvatarUrl(index: number, projectUrl = getSupabasePublicEnv().url) {
  const fileName = `default-${String(index + 1).padStart(2, "0")}.png`;
  return `${projectUrl.replace(/\/+$/, "")}/storage/v1/object/public/avatars/defaults/${fileName}`;
}

export function getDefaultAvatarUrls(projectUrl?: string) {
  return Array.from({ length: DEFAULT_AVATAR_COUNT }, (_, index) =>
    getDefaultAvatarUrl(index, projectUrl),
  );
}

/**
 * Picks the default a profile starts with. Assigned by the app rather than by the
 * database, which has no way to know the project's storage host.
 */
export function getRandomDefaultAvatarUrl(projectUrl?: string) {
  return getDefaultAvatarUrl(Math.floor(Math.random() * DEFAULT_AVATAR_COUNT), projectUrl);
}

/** Defaults are shared between users, so nobody's avatar change may delete one. */
export function isDefaultAvatarUrl(url: string | null | undefined, projectUrl?: string) {
  return url != null && getDefaultAvatarUrls(projectUrl).includes(url);
}
