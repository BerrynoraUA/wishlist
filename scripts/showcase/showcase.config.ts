import {
  SHOWCASE_SCENES,
  type ShowcaseScene,
} from "../../packages/backend/supabase/showcase/constants.ts";

export { SHOWCASE_SCENES };
export type { ShowcaseScene };

export type ShowcaseAppearance = "light" | "dark";

export interface ShowcaseStoreAssetSpec {
  readonly store: "apple" | "google-play";
  /** Device directory relative to ShowcaseConfig.outputDirectory. */
  readonly directory: string;
  readonly width: number;
  readonly height: number;
  readonly minimumUploadCount: number;
  readonly maximumUploadCount: number;
  readonly maximumFileSizeBytes?: number;
}

export interface ShowcaseIosDevice {
  readonly id: string;
  readonly platform: "ios";
  /** Exact name from `xcrun simctl list devices available`. */
  readonly simulator: string;
  /** Device type used to create a disposable simulator when the named one is absent. */
  readonly simulatorDeviceType?: string;
  /** Appearance used when the CLI does not pass --appearance. */
  readonly appearance: ShowcaseAppearance;
  readonly scenes: readonly ShowcaseScene[];
  readonly storeAsset: ShowcaseStoreAssetSpec;
}

export interface ShowcaseAndroidDevice {
  readonly id: string;
  readonly platform: "android";
  /** Exact name from `emulator -list-avds`. */
  readonly avd: string;
  readonly appearance: ShowcaseAppearance;
  /** Native ABI used by the AVD, from its config.ini `abi.type`. */
  readonly abi?: "arm64-v8a" | "x86_64" | "x86" | "armeabi-v7a";
  readonly scenes: readonly ShowcaseScene[];
  /** Optional capture viewport. Omit to use the AVD's native size and density. */
  readonly viewport?: {
    readonly width: number;
    readonly height: number;
    readonly density?: number;
  };
  readonly storeAsset: ShowcaseStoreAssetSpec;
}

export type ShowcaseDevice = ShowcaseIosDevice | ShowcaseAndroidDevice;

/**
 * A speech cloud pointing at something on the screen behind it. Each one names a visible
 * element and then says what it *means* — "3 Reserved" is a number the reader can already
 * count, but that it stops two people buying the same present is the part the screenshot
 * cannot tell them. Restating a visible label teaches nothing.
 */
export interface ShowcaseCallout {
  /** Pre-broken, so the cloud never has to guess where a line should wrap. */
  readonly lines: readonly string[];
  /** Which edge the cloud hangs off, so it breaks the device outline rather than floating inside it. */
  readonly side: "left" | "right";
  /**
   * The element this explains, in 0–1 screen coordinates. Aim at the blank space beside
   * it, never at its middle: the tail ends in a dot, and a dot on top of the label hides
   * the very thing the cloud is drawing attention to.
   */
  readonly anchor: { readonly x: number; readonly y: number };
  /**
   * Where the cloud sits relative to its anchor, in fractions of the screen height.
   * Negative is above. Per callout so tails point up as often as down and the clouds land
   * at different heights across the gallery.
   */
  readonly lift: number;
}

export interface ShowcaseSceneFrame {
  /**
   * Broken by hand: the highlighter marks the last line, so where the break falls decides
   * what gets emphasised. Headlines name the outcome the reader gets, not the feature that
   * produces it — a listing is read in about a second, and "never guess a present again"
   * lands in that second where "friends list sync" does not.
   */
  readonly headline: readonly string[];
  readonly callouts: readonly ShowcaseCallout[];
}

export interface ShowcaseFrameConfig {
  /** Framed output directory relative to the repository root. */
  readonly outputDirectory: string;
  readonly scenes: Readonly<Record<ShowcaseScene, ShowcaseSceneFrame>>;
  readonly background: Readonly<Record<ShowcaseAppearance, readonly [string, string]>>;
  readonly captionColor: Readonly<Record<ShowcaseAppearance, string>>;
  /** Highlighter swash drawn under the headline's last line. */
  readonly accentColor: Readonly<Record<ShowcaseAppearance, string>>;
  /** Heavy display face for the headline. */
  readonly headlineFontFamily: string;
  /** Text face for the callout clouds. */
  readonly fontFamily: string;
}

export interface ShowcaseConfig {
  readonly outputDirectory: string;
  readonly metroPort: number;
  readonly settleDelayMs: number;
  readonly devices: readonly ShowcaseDevice[];
  readonly frames: ShowcaseFrameConfig;
}

const ANDROID_ABIS = ["arm64-v8a", "x86_64", "x86", "armeabi-v7a"] as const;

export function resolveShowcaseAndroidAbi(
  value: string | undefined,
): NonNullable<ShowcaseAndroidDevice["abi"]> {
  if (!value) return "x86_64";
  if (ANDROID_ABIS.some((abi) => abi === value)) {
    return value as NonNullable<ShowcaseAndroidDevice["abi"]>;
  }
  throw new Error(
    `Unsupported WISHLANE_SHOWCASE_ANDROID_ABI '${value}'. Use ${ANDROID_ABIS.join(", ")}.`,
  );
}

const SCENES = [...SHOWCASE_SCENES];

/**
 * Tablets are not a supported form factor yet, so their store slots stay unfilled and
 * the targets below are skipped. The definitions are kept ready for the release that
 * adds tablet layouts — capture them again with:
 *
 *     WISHLANE_SHOWCASE_TABLETS=1 pnpm screenshots --platform android
 *
 * or flip this default to `true` to make them part of every run.
 */
export const CAPTURE_TABLETS = process.env.WISHLANE_SHOWCASE_TABLETS === "1";

/**
 * Both tablet slots reuse the phone AVD and only change the reported viewport, so
 * enabling them needs no extra emulator image.
 */
const ANDROID_TABLETS: readonly ShowcaseAndroidDevice[] = [
  {
    id: "android-tablet-7",
    platform: "android",
    avd: process.env.WISHLANE_SHOWCASE_AVD ?? "Pixel_10_Pro_XL",
    abi: resolveShowcaseAndroidAbi(process.env.WISHLANE_SHOWCASE_ANDROID_ABI),
    appearance: "light",
    viewport: { width: 1080, height: 1920, density: 288 },
    scenes: SCENES,
    storeAsset: {
      store: "google-play",
      directory: "google-play/tablet-7",
      width: 1080,
      height: 1920,
      minimumUploadCount: 4,
      maximumUploadCount: 8,
      maximumFileSizeBytes: 8 * 1024 * 1024,
    },
  },
  {
    id: "android-tablet-10",
    platform: "android",
    avd: process.env.WISHLANE_SHOWCASE_AVD ?? "Pixel_10_Pro_XL",
    abi: resolveShowcaseAndroidAbi(process.env.WISHLANE_SHOWCASE_ANDROID_ABI),
    appearance: "light",
    viewport: { width: 1440, height: 2560, density: 288 },
    scenes: SCENES,
    storeAsset: {
      store: "google-play",
      directory: "google-play/tablet-10",
      width: 1440,
      height: 2560,
      minimumUploadCount: 4,
      maximumUploadCount: 8,
      maximumFileSizeBytes: 8 * 1024 * 1024,
    },
  },
];

/**
 * The defaults cover every App Store Connect and Google Play upload slot the app
 * actually uses. `ios.supportsTablet` is false in app.json, so there is no iPad slot
 * to fill. Every target declares and validates its exact upload dimensions, so an SDK
 * or emulator change cannot silently produce files the stores reject.
 */
const config: ShowcaseConfig = {
  outputDirectory: "apps/native/artifacts/screenshots",
  // Dedicated port so the harness cannot attach to an ordinary `pnpm native` dev
  // server and photograph the wrong bundle.
  metroPort: 8199,
  settleDelayMs: 2_500,
  devices: [
    {
      id: "iphone-6.9",
      platform: "ios",
      simulator: "iPhone 17 Pro Max",
      simulatorDeviceType: "com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro-Max",
      appearance: "light",
      scenes: SCENES,
      storeAsset: {
        store: "apple",
        directory: "apple/iphone-6.9",
        width: 1320,
        height: 2868,
        minimumUploadCount: 1,
        maximumUploadCount: 10,
      },
    },
    {
      id: "iphone-6.5",
      platform: "ios",
      simulator: "Wishlane Showcase iPhone 14 Plus",
      simulatorDeviceType: "com.apple.CoreSimulator.SimDeviceType.iPhone-14-Plus",
      appearance: "light",
      scenes: SCENES,
      storeAsset: {
        store: "apple",
        directory: "apple/iphone-6.5",
        width: 1284,
        height: 2778,
        minimumUploadCount: 1,
        maximumUploadCount: 10,
      },
    },
    {
      id: "pixel",
      platform: "android",
      avd: process.env.WISHLANE_SHOWCASE_AVD ?? "Pixel_10_Pro_XL",
      abi: resolveShowcaseAndroidAbi(process.env.WISHLANE_SHOWCASE_ANDROID_ABI),
      appearance: "light",
      viewport: { width: 1080, height: 1920, density: 420 },
      scenes: SCENES,
      storeAsset: {
        store: "google-play",
        directory: "google-play/phone",
        width: 1080,
        height: 1920,
        minimumUploadCount: 2,
        maximumUploadCount: 8,
        maximumFileSizeBytes: 8 * 1024 * 1024,
      },
    },
    ...(CAPTURE_TABLETS ? ANDROID_TABLETS : []),
  ],
  frames: {
    outputDirectory: "apps/native/artifacts/framed",
    // Anchors are fractions of the captured screen, so they survive a change of upload
    // size — but they were tuned against the 9:16 Android capture. The iPhone slots are
    // 9:19.5, where the app lays out with more vertical room, so those frames want an
    // anchor pass of their own once iOS captures exist to check them against.
    scenes: {
      wishlists: {
        headline: ["Never lose a", "gift idea again"],
        callouts: [
          {
            lines: ["Gifts you claimed, so", "nobody buys it twice"],
            side: "left",
            anchor: { x: 0.3, y: 0.352 },
            lift: 0.14,
          },
          {
            lines: ["Only friends you accept", "can open this list"],
            side: "right",
            anchor: { x: 0.675, y: 0.716 },
            lift: -0.1,
          },
        ],
      },
      "item-link": {
        headline: ["Paste a link.", "It fills itself in."],
        // Both anchors sit in the empty right-hand end of their field. Pointing at the
        // left end would drag the bubble trail across the value meant to be read.
        callouts: [
          {
            lines: ["This link is the only", "thing you typed"],
            side: "right",
            anchor: { x: 0.72, y: 0.338 },
            lift: -0.16,
          },
          {
            lines: ["Name, photo and price", "arrived from the shop"],
            side: "left",
            anchor: { x: 0.3, y: 0.866 },
            lift: -0.125,
          },
        ],
      },
      discover: {
        headline: ["Know exactly", "what to buy them"],
        callouts: [
          {
            lines: ["Nine days' warning,", "not a same-day panic"],
            side: "left",
            anchor: { x: 0.72, y: 0.2545 },
            lift: -0.108,
          },
          {
            lines: ["Greyed out means taken", "— and they never know"],
            side: "right",
            anchor: { x: 0.88, y: 0.66 },
            lift: -0.075,
          },
        ],
      },
      "secret-santa": {
        headline: ["Secret Santa that", "runs itself"],
        callouts: [
          {
            lines: ["One budget everyone", "shops to"],
            side: "left",
            anchor: { x: 0.235, y: 0.431 },
            lift: 0.1,
          },
          {
            lines: ["Six people in, names", "drawn for you"],
            side: "right",
            anchor: { x: 0.632, y: 0.738 },
            lift: -0.1,
          },
        ],
      },
      "secret-santa-event": {
        headline: ["Names drawn.", "Nobody knows."],
        // One cloud only. The screen is already a stack of cards with nothing spare to
        // cover, and the match secrecy is the single claim worth making here.
        callouts: [
          {
            lines: ["Only you see this name.", "Everyone else sees theirs"],
            side: "right",
            anchor: { x: 0.62, y: 0.323 },
            lift: -0.115,
          },
        ],
      },
      wishlist: {
        headline: ["Get the exact", "one you wanted"],
        callouts: [
          {
            lines: ["They flag what they", "want most"],
            side: "right",
            anchor: { x: 0.775, y: 0.453 },
            lift: -0.09,
          },
          {
            lines: ["You pick who sees the", "list, and when it lands"],
            side: "left",
            anchor: { x: 0.253, y: 0.298 },
            lift: 0.19,
          },
        ],
      },
      friends: {
        headline: ["Never guess a", "present again"],
        callouts: [
          {
            lines: ["Nobody sees your lists", "until you accept them"],
            side: "right",
            anchor: { x: 0.757, y: 0.152 },
            lift: 0.09,
          },
          // Right again, unusually: every row here puts its avatar and name hard against
          // the left edge, so a left-hanging cloud can only land on top of a name.
          {
            lines: ["Three lists to browse", "instead of guessing"],
            side: "right",
            anchor: { x: 0.52, y: 0.604 },
            lift: -0.105,
          },
        ],
      },
    },
    background: {
      light: ["#FFFCFD", "#FFE6F1"],
      dark: ["#171014", "#2C1622"],
    },
    captionColor: {
      light: "#1D0F16",
      dark: "#FFF5F8",
    },
    accentColor: {
      light: "#FF3D8B",
      dark: "#FF5C9F",
    },
    headlineFontFamily: "Segoe UI Black, Arial Black, Segoe UI, Helvetica, sans-serif",
    fontFamily: "Segoe UI Semibold, Segoe UI, Helvetica Neue, Arial, sans-serif",
  },
};

export default config;
