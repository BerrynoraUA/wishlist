import {
  SHOWCASE_SCENES,
  type ShowcaseScene,
} from "../../packages/backend/supabase/showcase/constants.ts";

export { SHOWCASE_SCENES };
export type { ShowcaseScene };

export type ShowcaseAppearance = "light" | "dark";

/**
 * The hardware cut into the top of the screen, which the frame draws because a simulator
 * capture does not include it. Android phones get a punch-hole camera.
 */
export type ShowcaseCameraCutout = "dynamic-island" | "notch" | "punch-hole";

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
  readonly cutout: Exclude<ShowcaseCameraCutout, "punch-hole">;
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
 * A frame is the headline and the phone, nothing else. Store galleries are browsed at
 * thumbnail size, where a 30 px annotation on a 1080 px canvas shrinks to about 5 px: only
 * the headline survives, so each scene says its one thing there and lets the real screen
 * be the proof.
 */
export interface ShowcaseSceneFrame {
  /**
   * Broken by hand: the highlighter marks the last line, so where the break falls decides
   * what gets emphasised. Headlines name the outcome the reader gets, not the feature that
   * produces it — a listing is read in about a second, and "save any gift from any shop"
   * lands in that second where "link metadata scraping" does not.
   */
  readonly headline: readonly string[];
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
  /** Text face for the feature graphic's tagline and cards. */
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
 * The share scene photographs Chrome's share sheet on the emulator. The iOS runner has no
 * way to drive Safari's share sheet from `simctl`, so the App Store gallery goes without
 * it rather than showing a sheet that is not the real one.
 */
const IOS_SCENES = SCENES.filter((scene) => scene !== "share");

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
      cutout: "dynamic-island",
      scenes: IOS_SCENES,
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
      // The 14 Plus predates the Dynamic Island.
      cutout: "notch",
      scenes: IOS_SCENES,
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
    // The opening three carry the pitch: what Wishlane is, that it works from any app,
    // and what it does for the people you buy for. See SHOWCASE_SCENES for the order.
    scenes: {
      "item-link": { headline: ["Save any gift", "from any shop"] },
      share: { headline: ["Share to Wishlane", "from any app"] },
      discover: { headline: ["Gifts they want.", "No duplicates."] },
      wishlists: { headline: ["A wishlist for", "every occasion"] },
      wishlist: { headline: ["You choose", "who sees it"] },
      "secret-santa-event": { headline: ["Secret Santa,", "sorted."] },
    },
    // Wordmark and tagline track apps/native/store/listings/en.json.
    featureGraphic: {
      path: "google-play/feature-graphic.png",
      width: 1024,
      height: 500,
      maximumFileSizeBytes: 15 * 1024 * 1024,
      wordmark: "Wishlane",
      tagline: "Save anything from any shop",
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
