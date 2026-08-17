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

export interface ShowcaseFrameConfig {
  /** Framed output directory relative to the repository root. */
  readonly outputDirectory: string;
  readonly captions: Readonly<Record<ShowcaseScene, string>>;
  readonly background: Readonly<Record<ShowcaseAppearance, readonly [string, string]>>;
  readonly captionColor: Readonly<Record<ShowcaseAppearance, string>>;
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
    captions: {
      wishlists: "Never lose a gift idea again",
      wishlist: "They get the exact one you wanted",
      "item-link": "Paste a link, the rest fills itself",
      discover: "See what your friends actually want",
      friends: "Everyone's lists in one place",
      "secret-santa": "Run Secret Santa without the group chat",
      "secret-santa-event": "Names drawn, budget set, nobody knows",
    },
    background: {
      light: ["#FFF9FB", "#F7EDF2"],
      dark: ["#171014", "#24181E"],
    },
    captionColor: {
      light: "#2F2027",
      dark: "#FFF5F8",
    },
    fontFamily: "Segoe UI, Helvetica Neue, Arial, sans-serif",
  },
};

export default config;
