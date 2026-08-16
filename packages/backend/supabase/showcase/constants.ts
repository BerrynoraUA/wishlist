/**
 * Constants shared by the in-app showcase fixtures, the capture coordinator and the
 * host-side runner in `scripts/showcase/`. Deliberately free of imports so the runner
 * can load this file directly under Node's type stripping.
 */

export const SHOWCASE_SCENES = ["wishlists", "wishlist", "friends", "secret-santa"] as const;

export type ShowcaseScene = (typeof SHOWCASE_SCENES)[number];

export function isShowcaseScene(value: unknown): value is ShowcaseScene {
  return SHOWCASE_SCENES.some((scene) => scene === value);
}

/**
 * The runner reverses this port onto both the simulator and the emulator, so the app
 * always reaches the control channel at 127.0.0.1 regardless of platform.
 */
export const SHOWCASE_CONTROL_PORT = 8299;
export const SHOWCASE_CONTROL_ORIGIN = `http://127.0.0.1:${SHOWCASE_CONTROL_PORT}`;

/**
 * The control server also serves `scripts/showcase/assets/`, so fixture rows can carry
 * ordinary image URLs without a storage bucket behind them.
 */
export function showcaseAssetUrl(path: string): string {
  return `${SHOWCASE_CONTROL_ORIGIN}/assets/${path}`;
}

/** Seeded vector portraits are rendered on demand, so no avatar files are checked in. */
export function showcaseAvatarUrl(initials: string, from: string, to: string): string {
  const query = new URLSearchParams({ from, to }).toString();
  return `${SHOWCASE_CONTROL_ORIGIN}/avatars/${encodeURIComponent(initials)}.png?${query}`;
}

/** Fixed ids let the runner, the fixtures and the app agree on the detail scenes. */
export const SHOWCASE_OWNER_ID = "5b0f9c40-0000-4000-8000-000000000001";
export const SHOWCASE_WISHLIST_ID = "5b0f9c40-0000-4000-8000-000000000101";
export const SHOWCASE_EVENT_ID = "5b0f9c40-0000-4000-8000-000000000201";

export const SHOWCASE_FRIEND_IDS = [
  "5b0f9c40-0000-4000-8000-000000000002",
  "5b0f9c40-0000-4000-8000-000000000003",
  "5b0f9c40-0000-4000-8000-000000000004",
  "5b0f9c40-0000-4000-8000-000000000005",
  "5b0f9c40-0000-4000-8000-000000000006",
] as const;

/** Sends the friend request that the Friends scene shows as an incoming badge. */
export const SHOWCASE_REQUESTER_ID = "5b0f9c40-0000-4000-8000-000000000007";

export function showcaseSceneRoute(scene: ShowcaseScene): string {
  switch (scene) {
    case "wishlists":
      return "/(tabs)/wishlists";
    case "wishlist":
      return `/(tabs)/wishlists/${SHOWCASE_WISHLIST_ID}`;
    case "friends":
      return "/(tabs)/friends";
    case "secret-santa":
      return "/(tabs)/secret-santa";
  }
}

/**
 * Matches the pathname expo-router reports once `showcaseSceneRoute` has settled.
 * The `(tabs)` group is not part of the resolved pathname.
 */
export function showcaseSceneMatchesPathname(scene: ShowcaseScene, pathname: string): boolean {
  const path = (pathname.split(/[?#]/u, 1)[0] ?? pathname).replace(/\/$/u, "") || "/";
  switch (scene) {
    case "wishlists":
      return path === "/wishlists";
    case "wishlist":
      return path === `/wishlists/${SHOWCASE_WISHLIST_ID}`;
    case "friends":
      return path === "/friends";
    case "secret-santa":
      return path === "/secret-santa";
  }
}
