import {
  SHOWCASE_SCENES,
  type ShowcaseScene,
} from "../../packages/backend/supabase/showcase/constants.ts";

export { SHOWCASE_SCENES };
export type { ShowcaseScene };

export type ShowcaseAppearance = "light" | "dark";

/**
 * Callout anchors are fractions of the captured screen, so they only hold while the screen
 * keeps its shape. The two platforms do not: Android captures at 9:16, the iPhone slots at
 * 9:19.5, and the app spends that extra height spreading its cards apart. The same `y`
 * therefore lands on a different element per platform, which is why every scene carries a
 * tuned set for each.
 */
export type ShowcaseDevicePlatform = "ios" | "android";

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
  /** One tuned set per platform — see {@link ShowcaseDevicePlatform}. */
  readonly callouts: Readonly<Record<ShowcaseDevicePlatform, readonly ShowcaseCallout[]>>;
}

/**
 * Google Play's listing banner. Required for every Play listing and, unlike the
 * screenshots, not something a device can be photographed for — it is drawn from the
 * same tokens as the framed captions. See apps/native/store/RELEASE-CHECKLIST.md §5.
 */
export interface ShowcaseFeatureGraphicSpec {
  /** Output path relative to ShowcaseFrameConfig.outputDirectory. */
  readonly path: string;
  readonly width: number;
  readonly height: number;
  readonly maximumFileSizeBytes: number;
  /** The app name, set under the highlighter swash. */
  readonly wordmark: string;
  readonly tagline: string;
}

export interface ShowcaseFrameConfig {
  /** Framed output directory relative to the repository root. */
  readonly outputDirectory: string;
  readonly scenes: Readonly<Record<ShowcaseScene, ShowcaseSceneFrame>>;
  readonly featureGraphic: ShowcaseFeatureGraphicSpec;
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
        // App Store Connect takes 3–10 per size — see apps/native/store/RELEASE-CHECKLIST.md §4.
        minimumUploadCount: 3,
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
        minimumUploadCount: 3,
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
    // size within a platform. Across platforms they do not — see ShowcaseDevicePlatform —
    // so each scene lists the Android set it was first drawn against and an iOS set
    // measured against the 9:19.5 captures.
    scenes: {
      wishlists: {
        headline: ["Never lose a", "gift idea again"],
        callouts: {
          android: [
            {
              lines: ["Taken items show up —", "no double gifts"],
              side: "left",
              anchor: { x: 0.3, y: 0.352 },
              lift: 0.14,
            },
            {
              lines: ["You choose who", "gets to see it"],
              side: "right",
              anchor: { x: 0.675, y: 0.702 },
              lift: -0.086,
            },
          ],
          ios: [
            // Dot in the empty right half of the "3 Reserved" tile; cloud drops onto the
            // cake photo below, which is the only thing on this screen worth covering.
            {
              lines: ["Taken items show up —", "no double gifts"],
              side: "left",
              anchor: { x: 0.42, y: 0.302 },
              lift: 0.125,
            },
            // Dot just left of "Friends only"; cloud sits on the plain teal card under it.
            {
              lines: ["You choose who", "gets to see it"],
              side: "right",
              anchor: { x: 0.665, y: 0.545 },
              lift: 0.12,
            },
          ],
        },
      },
      "item-link": {
        headline: ["Paste a link.", "It fills itself in."],
        // Both anchors sit in the empty right-hand end of their field. Pointing at the
        // left end would drag the bubble trail across the value meant to be read.
        callouts: {
          android: [
            {
              lines: ["Drop a link —", "that's it"],
              side: "right",
              anchor: { x: 0.72, y: 0.338 },
              lift: -0.16,
            },
            {
              lines: ["Photo and price,", "pulled in for you"],
              side: "left",
              anchor: { x: 0.3, y: 0.866 },
              lift: -0.125,
            },
          ],
          ios: [
            // Cloud rides up into the header, clear of the date chip it used to cover.
            {
              lines: ["Drop a link —", "that's it"],
              side: "right",
              anchor: { x: 0.74, y: 0.325 },
              lift: -0.2,
            },
            // The one that mattered most: this cloud used to sit on "279.00", hiding the
            // autofilled price the headline is promising. Dot now lands in the blank right
            // end of the price field and the cloud rests on the product photo instead.
            {
              lines: ["Photo and price,", "pulled in for you"],
              side: "left",
              anchor: { x: 0.4, y: 0.716 },
              lift: -0.166,
            },
          ],
        },
      },
      discover: {
        headline: ["Know exactly", "what to buy them"],
        callouts: {
          android: [
            {
              lines: ["Never miss a date —", "we remind you in time"],
              side: "left",
              anchor: { x: 0.72, y: 0.2405 },
              lift: -0.094,
            },
            {
              lines: ["Mark the gift you're giving —", "no one else will take it"],
              side: "right",
              anchor: { x: 0.88, y: 0.66 },
              lift: 0.152,
            },
          ],
          ios: [
            // Cloud moved down off the tab bar it used to cover; dot sits in the gap
            // between "in 9 days" and the date chip beside it.
            {
              lines: ["Never miss a date —", "we remind you in time"],
              side: "left",
              anchor: { x: 0.736, y: 0.223 },
              lift: 0.197,
            },
            // Dot on the greyed-out reserved card, below its RESERVED band. The cloud
            // clears the "High" badge underneath and lands on the last photo.
            {
              lines: ["Mark the gift you're giving —", "no one else will take it"],
              side: "right",
              anchor: { x: 0.8, y: 0.59 },
              lift: 0.275,
            },
          ],
        },
      },
      "secret-santa": {
        headline: ["Secret Santa that", "runs itself"],
        callouts: {
          android: [
            {
              lines: ["Date, budget, people —", "it runs itself"],
              side: "left",
              anchor: { x: 0.235, y: 0.431 },
              lift: 0.1,
            },
            {
              lines: ["Same budget", "for everyone"],
              side: "right",
              anchor: { x: 0.632, y: 0.738 },
              lift: -0.152,
            },
          ],
          ios: [
            // Dot in the gap between the event name and its date column; cloud sits inside
            // the gift photo and stops short of the "Studio gift swap" title it once hid.
            {
              lines: ["Date, budget, people —", "it runs itself"],
              side: "left",
              anchor: { x: 0.53, y: 0.34 },
              lift: 0.13,
            },
            // iOS has a tall empty tail below the second card. Parking this cloud there
            // keeps both event rows legible and stops the screen looking half-finished.
            {
              lines: ["Same budget", "for everyone"],
              side: "right",
              anchor: { x: 0.35, y: 0.585 },
              lift: 0.145,
            },
          ],
        },
      },
      "secret-santa-event": {
        headline: ["Names drawn.", "Nobody knows."],
        // One cloud only. The screen is already a stack of cards with nothing spare to
        // cover, and the match secrecy is the single claim worth making here.
        callouts: {
          android: [
            {
              lines: ["Your match.", "Just for your eyes"],
              side: "right",
              anchor: { x: 0.62, y: 0.323 },
              lift: -0.115,
            },
          ],
          ios: [
            // Lifted downwards rather than up: above the match card is the header strip,
            // where the cloud landed on the "5 people" chip. Below it there is a band of
            // card padding before "Gift suggestions" that costs nothing to cover.
            {
              lines: ["Your match.", "Just for your eyes"],
              side: "right",
              anchor: { x: 0.68, y: 0.232 },
              lift: 0.0905,
            },
          ],
        },
      },
      wishlist: {
        headline: ["Get the exact", "one you wanted"],
        callouts: {
          android: [
            {
              lines: ["Mark what you", "want most"],
              side: "right",
              anchor: { x: 0.775, y: 0.453 },
              lift: -0.09,
            },
            {
              lines: ["Only you decide", "who can see it"],
              side: "left",
              anchor: { x: 0.253, y: 0.2563 },
              lift: 0.2317,
            },
          ],
          ios: [
            // Dot to the left of the "High" badge, cloud lifted above it onto the item
            // count row — the old placement sat on the badge it was pointing at.
            {
              lines: ["Mark what you", "want most"],
              side: "right",
              anchor: { x: 0.71, y: 0.357 },
              lift: -0.087,
            },
            // Dot in the tail of the "Friends only" chip; cloud drops to the product photo
            // and stays clear of the item name and the Reserve / Buy buttons below it.
            {
              lines: ["Only you decide", "who can see it"],
              side: "left",
              anchor: { x: 0.4, y: 0.218 },
              lift: 0.252,
            },
          ],
        },
      },
      friends: {
        headline: ["Never guess a", "present again"],
        callouts: {
          android: [
            {
              lines: ["Lists stay closed", "until you confirm"],
              side: "right",
              anchor: { x: 0.85, y: 0.1083 },
              lift: 0.1337,
            },
            // Right again, unusually: every row here puts its avatar and name hard against
            // the left edge, so a left-hanging cloud can only land on top of a name.
            {
              lines: ["See what your friends", "actually want"],
              side: "right",
              anchor: { x: 0.52, y: 0.604 },
              lift: -0.105,
            },
          ],
          ios: [
            // Both stay right for the reason above. Names and handles end around x=0.5, so
            // a right-hanging cloud clears every one of them.
            {
              lines: ["Lists stay closed", "until you confirm"],
              side: "right",
              anchor: { x: 0.645, y: 0.105 },
              lift: 0.162,
            },
            // Dropped into the empty run below the last friend rather than floating over
            // them — the taller iOS screen leaves a quarter of itself blank here.
            {
              lines: ["See what your friends", "actually want"],
              side: "right",
              anchor: { x: 0.55, y: 0.611 },
              lift: 0.189,
            },
          ],
        },
      },
    },
    // Wordmark and tagline track apps/native/store/listings/en.json.
    featureGraphic: {
      path: "google-play/feature-graphic.png",
      width: 1024,
      height: 500,
      maximumFileSizeBytes: 15 * 1024 * 1024,
      wordmark: "Wishlane",
      tagline: "Wishlists, shared beautifully",
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
