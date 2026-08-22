/**
 * Constants shared by the in-app showcase fixtures, the capture coordinator and the
 * host-side runner in `scripts/showcase/`. Deliberately free of imports so the runner
 * can load this file directly under Node's type stripping.
 */

/**
 * Declaration order is the store gallery order, and the capture filenames are numbered
 * from it — App Store Connect and Play Console both take screenshots in file order, so
 * this array is the single place that decides what a browsing user sees first. The
 * opening three carry the pitch: what it is, how little work it is, and what it does for
 * the people you buy for. Reorder here and the numbering follows.
 */
export const SHOWCASE_SCENES = [
  "wishlists",
  "item-link",
  "discover",
  "secret-santa",
  "secret-santa-event",
  "wishlist",
  "friends",
] as const;

export type ShowcaseScene = (typeof SHOWCASE_SCENES)[number];

/**
 * Capture filename stem, prefixed with its gallery position. Zero-padded so a
 * lexicographic listing — which is what both consoles and every file picker give you —
 * still matches the numeric order once there are ten or more.
 */
export function showcaseSceneFileStem(scene: ShowcaseScene): string {
  const position = SHOWCASE_SCENES.indexOf(scene) + 1;
  return `${String(position).padStart(2, "0")}-${scene}`;
}

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

/**
 * The product link the create-from-link scene opens with. Nothing fetches it — the
 * showcase build answers the scrape locally — but it has to look like a link a shopper
 * would actually paste.
 */
// Short enough that the field shows the whole link rather than scrolling to its tail,
// which is what a reader needs to see to understand the screen.
export const SHOWCASE_ITEM_LINK_URL = "https://sony.co.uk/wh-1000xm5";

/** What the showcase build returns instead of calling the scraper. */
export const SHOWCASE_SCRAPED_PRODUCT = {
  title: "Sony WH-1000XM5 headphones",
  description: "Black — the XM5s, not a similar pair",
  image: showcaseAssetUrl("content/items/sony-wh-1000xm5.jpg"),
  price: "279.00",
  discount_price: "249.00",
  has_discount: true,
  discount_end_date: null,
  currency: "GBP",
};

/**
 * Scenes that are an overlay over a route rather than a route of their own. The
 * capture coordinator navigates to the scene's route and then asks the app to open
 * this, so the capture is the production sheet rather than a rebuilt one.
 */
export type ShowcaseOverlay = "item-link";

export function showcaseSceneOverlay(scene: ShowcaseScene): ShowcaseOverlay | null {
  return scene === "item-link" ? "item-link" : null;
}

export function showcaseSceneRoute(scene: ShowcaseScene): string {
  switch (scene) {
    case "wishlists":
      return "/(tabs)/wishlists";
    case "wishlist":
    // The create sheet defaults to the wishlist the user is looking at, so the
    // link scene opens over the same detail route.
    case "item-link":
      return `/(tabs)/wishlists/${SHOWCASE_WISHLIST_ID}`;
    case "discover":
      return "/(tabs)/wishlists/discover";
    case "friends":
      return "/(tabs)/friends";
    case "secret-santa":
      return "/(tabs)/secret-santa";
    case "secret-santa-event":
      return `/(tabs)/secret-santa/${SHOWCASE_EVENT_ID}`;
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
    case "item-link":
      return path === `/wishlists/${SHOWCASE_WISHLIST_ID}`;
    case "discover":
      return path === "/wishlists/discover";
    case "friends":
      return path === "/friends";
    case "secret-santa":
      return path === "/secret-santa";
    case "secret-santa-event":
      return path === `/secret-santa/${SHOWCASE_EVENT_ID}`;
  }
}
