/**
 * Constants shared by the in-app showcase fixtures, the capture coordinator and the
 * host-side runner in `scripts/showcase/`. Deliberately free of imports so the runner
 * can load this file directly under Node's type stripping.
 */

/**
 * Declaration order is the store gallery order, and the capture filenames are numbered
 * from it — App Store Connect and Play Console both take screenshots in file order, so
 * this array is the single place that decides what a browsing user sees first. The
 * opening three carry the pitch: what it is (a wishlist you fill from any shop link),
 * where it works (from any app, via the share sheet), and what it does for the people
 * you buy for. Reorder here and the numbering follows.
 */
export const SHOWCASE_SCENES = [
  "item-link",
  "share",
  "discover",
  "wishlists",
  "wishlist",
  "secret-santa-event",
] as const;

export type ShowcaseScene = (typeof SHOWCASE_SCENES)[number];

/**
 * `share` is photographed in the browser's share sheet, outside the app, so the app never
 * navigates to it. Every other scene is one of the app's own screens.
 */
export type ShowcaseAppScene = Exclude<ShowcaseScene, "share">;

/**
 * Capture filename stem, prefixed with its position in the gallery it belongs to. A
 * device that skips a scene numbers its own gallery without a gap. Zero-padded so a
 * lexicographic listing — which is what both consoles and every file picker give you —
 * still matches the numeric order once there are ten or more.
 */
export function showcaseSceneFileStem(
  scene: ShowcaseScene,
  gallery: readonly ShowcaseScene[] = SHOWCASE_SCENES,
): string {
  const position = gallery.indexOf(scene) + 1;
  return `${String(position).padStart(2, "0")}-${scene}`;
}

export function isShowcaseAppScene(value: unknown): value is ShowcaseAppScene {
  return value !== "share" && SHOWCASE_SCENES.some((scene) => scene === value);
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
export const SHOWCASE_ITEM_LINK_URL = "https://sony.com/wh-1000xm5";

/** What the showcase build returns instead of calling the scraper. */
export const SHOWCASE_SCRAPED_PRODUCT = {
  title: "Sony WH-1000XM5 headphones",
  description: "Black — the XM5s, not a similar pair",
  image: showcaseAssetUrl("content/items/sony-wh-1000xm5.jpg"),
  price: "399.99",
  discount_price: "329.99",
  has_discount: true,
  discount_end_date: null,
  currency: "USD",
};

/**
 * The product page the `share` scene opens in the browser and shares from. The control
 * server renders it from the scraped product above, so the page, the link in the share
 * sheet and the item the next screenshot fills in are one product.
 */
export const SHOWCASE_SHOP_PAGE_PATH = "/shop";

/**
 * Scenes that are an overlay over a route rather than a route of their own. The
 * capture coordinator navigates to the scene's route and then asks the app to open
 * this, so the capture is the production sheet rather than a rebuilt one.
 */
export type ShowcaseOverlay = "item-link";

export function showcaseSceneOverlay(scene: ShowcaseAppScene): ShowcaseOverlay | null {
  return scene === "item-link" ? "item-link" : null;
}

export function showcaseSceneRoute(scene: ShowcaseAppScene): string {
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
    case "secret-santa-event":
      return `/(tabs)/secret-santa/${SHOWCASE_EVENT_ID}`;
  }
}

/**
 * Matches the pathname expo-router reports once `showcaseSceneRoute` has settled.
 * The `(tabs)` group is not part of the resolved pathname.
 */
export function showcaseSceneMatchesPathname(scene: ShowcaseAppScene, pathname: string): boolean {
  const path = (pathname.split(/[?#]/u, 1)[0] ?? pathname).replace(/\/$/u, "") || "/";
  switch (scene) {
    case "wishlists":
      return path === "/wishlists";
    case "wishlist":
    case "item-link":
      return path === `/wishlists/${SHOWCASE_WISHLIST_ID}`;
    case "discover":
      return path === "/wishlists/discover";
    case "secret-santa-event":
      return path === `/secret-santa/${SHOWCASE_EVENT_ID}`;
  }
}
