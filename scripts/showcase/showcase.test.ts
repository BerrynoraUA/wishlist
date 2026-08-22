import * as NodeFS from "node:fs";

import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

import {
  SHOWCASE_SCENES,
  SHOWCASE_WISHLIST_ID,
  showcaseAssetUrl,
  showcaseSceneFileStem,
  showcaseSceneMatchesPathname,
  showcaseSceneRoute,
} from "../../packages/backend/supabase/showcase/constants.ts";
import {
  SHOWCASE_ITEMS,
  SHOWCASE_SECRET_SANTA_LIST,
  SHOWCASE_WISHLISTS,
} from "../../packages/backend/supabase/showcase/data.ts";
import { buildShowcaseAvatarSvg, renderShowcaseAvatar } from "./showcase-control-server.ts";
import {
  buildDeviceOverlaySvg,
  buildFrameBackgroundSvg,
  cloudPath,
  computeFrameLayout,
  fitFontSize,
} from "./showcase-frames.ts";
import {
  normalizeStorePng,
  readPngMetadata,
  validateStoreAsset,
  validateStoreAssetCount,
} from "./showcase-images.ts";
import showcaseConfig, { CAPTURE_TABLETS, resolveShowcaseAndroidAbi } from "./showcase.config.ts";
import {
  parseShowcaseCliArgs,
  planShowcaseCaptures,
  resolveAndroidSdkRoot,
  showcaseCaptureDirectory,
} from "./showcase.ts";

const APPLE_SPEC = {
  store: "apple",
  directory: "apple/iphone-6.9",
  width: 1320,
  height: 2868,
  minimumUploadCount: 1,
  maximumUploadCount: 10,
} as const;

const PLAY_SPEC = {
  store: "google-play",
  directory: "google-play/phone",
  width: 1080,
  height: 1920,
  minimumUploadCount: 2,
  maximumUploadCount: 8,
  maximumFileSizeBytes: 8 * 1024 * 1024,
} as const;

function rgbaPng(width: number, height: number): Buffer {
  // Built with the same encoder the harness normalizes with, so the fixture always
  // matches whatever pngjs produces on this platform.
  const png = new PNG({ width, height });
  png.data.fill(200);
  return PNG.sync.write(png);
}

describe("parseShowcaseCliArgs", () => {
  it("expands aggregate platform and appearance values", () => {
    const options = parseShowcaseCliArgs(["--platform", "all", "--appearance", "both"]);
    expect([...options.platforms].sort()).toEqual(["android", "ios"]);
    expect([...options.appearances].sort()).toEqual(["dark", "light"]);
  });

  it("collects repeatable filters and flags", () => {
    const options = parseShowcaseCliArgs([
      "--device",
      "pixel",
      "--scene",
      "friends",
      "--scene",
      "secret-santa",
      "--skip-build",
      "--no-frames",
    ]);
    expect([...options.deviceIds]).toEqual(["pixel"]);
    expect([...options.scenes].sort()).toEqual(["friends", "secret-santa"]);
    expect(options.skipBuild).toBe(true);
    expect(options.skipFrames).toBe(true);
  });

  it("rejects unknown scenes, platforms and options", () => {
    expect(() => parseShowcaseCliArgs(["--scene", "terminal"])).toThrow(/Unsupported scene/u);
    expect(() => parseShowcaseCliArgs(["--platform", "web"])).toThrow(/Unsupported platform/u);
    expect(() => parseShowcaseCliArgs(["--wat"])).toThrow(/Unknown option/u);
    expect(() => parseShowcaseCliArgs(["--device"])).toThrow(/requires a value/u);
  });
});

describe("planShowcaseCaptures", () => {
  const noFilters = {
    platforms: new Set<never>(),
    deviceIds: new Set<string>(),
    scenes: new Set<never>(),
    appearances: new Set<never>(),
  };

  it("captures every configured device once at its default appearance", () => {
    const captures = planShowcaseCaptures(showcaseConfig, noFilters);
    expect(captures).toHaveLength(showcaseConfig.devices.length);
    expect(captures.every((capture) => capture.appearance === capture.device.appearance)).toBe(
      true,
    );
  });

  it("multiplies devices by the requested appearances", () => {
    const captures = planShowcaseCaptures(showcaseConfig, {
      ...noFilters,
      appearances: new Set(["light", "dark"] as const),
    });
    expect(captures).toHaveLength(showcaseConfig.devices.length * 2);
  });

  it("fails loudly on an unknown device", () => {
    expect(() =>
      planShowcaseCaptures(showcaseConfig, { ...noFilters, deviceIds: new Set(["iphone-4"]) }),
    ).toThrow(/Unknown device/u);
  });

  it("fails when no capture survives the filters", () => {
    expect(() =>
      planShowcaseCaptures(
        { ...showcaseConfig, devices: [{ ...showcaseConfig.devices[0]!, scenes: [] }] },
        noFilters,
      ),
    ).toThrow(/No captures match/u);
  });
});

describe("tablet capture flag", () => {
  it("leaves tablet slots out of a default run", () => {
    expect(CAPTURE_TABLETS).toBe(false);
    expect(showcaseConfig.devices.map((device) => device.id)).not.toContain("android-tablet-7");
    expect(
      showcaseConfig.devices.every((device) => !device.storeAsset.directory.includes("tablet")),
    ).toBe(true);
  });
});

describe("showcaseCaptureDirectory", () => {
  it("splits store slots by appearance", () => {
    const directory = showcaseCaptureDirectory("out", {
      device: showcaseConfig.devices[0]!,
      appearance: "dark",
    });
    expect(directory.split(/[\\/]/u)).toEqual(["out", "apple", "iphone-6.9", "dark"]);
  });
});

describe("store asset validation", () => {
  it("accepts a normalized capture at the exact upload size", () => {
    const png = normalizeStorePng(rgbaPng(APPLE_SPEC.width, APPLE_SPEC.height));
    expect(readPngMetadata(png).hasAlpha).toBe(false);
    expect(validateStoreAsset(APPLE_SPEC, png).colorType).toBe(2);
  });

  it("rejects the wrong dimensions", () => {
    const png = normalizeStorePng(rgbaPng(100, 200));
    expect(() => validateStoreAsset(APPLE_SPEC, png)).toThrow(/requires 1320×2868/u);
  });

  it("rejects a capture that still carries alpha", () => {
    const png = rgbaPng(APPLE_SPEC.width, APPLE_SPEC.height);
    expect(() => validateStoreAsset(APPLE_SPEC, png)).toThrow(/without alpha/u);
  });

  it("rejects non-9:16 Google Play uploads", () => {
    const png = normalizeStorePng(rgbaPng(1080, 1800));
    expect(() => validateStoreAsset({ ...PLAY_SPEC, height: 1800 }, png)).toThrow(/9:16/u);
  });

  it("rejects a file that is not a PNG at all", () => {
    expect(() => readPngMetadata(new Uint8Array(4))).toThrow(/not a valid PNG/u);
  });

  it("enforces the store's upload counts", () => {
    expect(() => validateStoreAssetCount(PLAY_SPEC, 9, false)).toThrow(/at most 8/u);
    expect(() => validateStoreAssetCount(PLAY_SPEC, 1, true)).toThrow(/at least 2/u);
    expect(() => validateStoreAssetCount(PLAY_SPEC, 1, false)).not.toThrow();
  });
});

describe("frame layout", () => {
  it("fits the complete phone below the caption", () => {
    const layout = computeFrameLayout(APPLE_SPEC, 2);
    expect(layout.deviceX).toBeGreaterThan(0);
    expect(layout.deviceX + layout.deviceWidth).toBeLessThanOrEqual(APPLE_SPEC.width);
    expect(layout.deviceY).toBeLessThan(APPLE_SPEC.height);
    expect(layout.deviceY + layout.deviceHeight).toBeLessThan(APPLE_SPEC.height);
    expect(layout.screenY).toBeGreaterThan(layout.deviceY);
    expect(layout.screenY + layout.screenHeight).toBeLessThan(layout.deviceY + layout.deviceHeight);
  });

  it("leaves room below the caption for every line", () => {
    const one = computeFrameLayout(APPLE_SPEC, 1);
    const two = computeFrameLayout(APPLE_SPEC, 2);
    expect(two.deviceY).toBeGreaterThan(one.deviceY);
  });

  it("shrinks a headline that would run past the margins", () => {
    expect(fitFontSize(["short"], 1000, 80)).toBe(80);
    const long = "a".repeat(60);
    const fitted = fitFontSize([long], 1000, 80);
    expect(fitted).toBeLessThan(80);
    expect(long.length * fitted * 0.575).toBeLessThanOrEqual(1000);
  });

  it("renders store-specific hardware details", () => {
    const iphone = buildDeviceOverlaySvg(computeFrameLayout(APPLE_SPEC, 1), "apple");
    const android = buildDeviceOverlaySvg(computeFrameLayout(PLAY_SPEC, 1), "google-play");
    expect(iphone).toContain("<rect");
    expect(iphone).toContain("<circle");
    expect(android.match(/<circle/gu)).toHaveLength(2);
    expect(iphone).not.toBe(android);
  });

  it("highlights the headline's last line, which is where the hand break puts the payoff", () => {
    const svg = buildFrameBackgroundSvg(
      computeFrameLayout(PLAY_SPEC, 2),
      ["Never lose a", "gift idea again"],
      "light",
      showcaseConfig.frames,
    );
    const swashY = Number(/<g transform="rotate\([^ ]+ [^ ]+ ([\d.]+)\)/u.exec(svg)?.[1]);
    const baselines = [...svg.matchAll(/<text [^>]*y="([\d.]+)"/gu)].map((match) =>
      Number(match[1]),
    );
    expect(baselines).toHaveLength(2);
    expect(swashY).toBeGreaterThan(baselines[0]!);
  });
});

describe("callout clouds", () => {
  it("traces a ring of lobes as one closed path of arcs", () => {
    const lobes = Array.from({ length: 10 }, (_, index) => {
      const angle = (index / 10) * Math.PI * 2;
      return { x: 200 + 90 * Math.cos(angle), y: 120 + 50 * Math.sin(angle), r: 44 };
    });
    const path = cloudPath(lobes, { x: 200, y: 120 });
    expect(path.startsWith("M")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    expect(path.match(/A/gu)).toHaveLength(lobes.length);
    // One shape, not a stack: no second subpath, and no non-finite coordinate.
    expect(path.match(/M/gu)).toHaveLength(1);
    expect(path).not.toMatch(/NaN|Infinity/u);
  });

  it("gives every scene a headline and anchors its callouts inside the screen", () => {
    for (const scene of SHOWCASE_SCENES) {
      const copy = showcaseConfig.frames.scenes[scene];
      expect(copy.headline.length).toBeGreaterThan(0);
      expect(copy.callouts.length).toBeGreaterThan(0);
      for (const callout of copy.callouts) {
        expect(callout.lines.length).toBeGreaterThan(0);
        expect(callout.anchor.x).toBeGreaterThan(0);
        expect(callout.anchor.x).toBeLessThan(1);
        expect(callout.anchor.y).toBeGreaterThan(0);
        expect(callout.anchor.y).toBeLessThan(1);
        // A cloud sitting on its own anchor leaves no room for a tail.
        expect(Math.abs(callout.lift)).toBeGreaterThan(0.02);
      }
    }
  });
});

describe("scene routing", () => {
  it("round-trips every scene between route and pathname", () => {
    expect(showcaseSceneRoute("wishlist")).toContain(SHOWCASE_WISHLIST_ID);
    expect(showcaseSceneMatchesPathname("wishlist", `/wishlists/${SHOWCASE_WISHLIST_ID}`)).toBe(
      true,
    );
    expect(showcaseSceneMatchesPathname("wishlists", "/wishlists")).toBe(true);
    expect(showcaseSceneMatchesPathname("wishlists", `/wishlists/${SHOWCASE_WISHLIST_ID}`)).toBe(
      false,
    );
    expect(showcaseSceneMatchesPathname("secret-santa", "/secret-santa/")).toBe(true);
  });
});

describe("gallery ordering", () => {
  it("numbers every scene from its position in the store order", () => {
    expect(SHOWCASE_SCENES.map(showcaseSceneFileStem)[0]).toBe(`01-${SHOWCASE_SCENES[0]}`);
    expect(showcaseSceneFileStem(SHOWCASE_SCENES[1]!)).toBe(`02-${SHOWCASE_SCENES[1]}`);
  });

  it("sorts lexicographically into the declared order, which is how both consoles read it", () => {
    const names = SHOWCASE_SCENES.map((scene) => `${showcaseSceneFileStem(scene)}.png`);
    expect([...names].sort()).toStrictEqual(names);
  });

  it("leads the gallery with the scenes that carry the pitch", () => {
    expect(SHOWCASE_SCENES.slice(0, 3)).toStrictEqual(["wishlists", "item-link", "discover"]);
  });
});

describe("host environment resolution", () => {
  it("locates the Android SDK per platform", () => {
    expect(resolveAndroidSdkRoot({ ANDROID_HOME: "/sdk" })).toBe("/sdk");
    expect(resolveAndroidSdkRoot({ USERPROFILE: "C:/Users/x" }, "win32")).toContain("Android");
    expect(resolveShowcaseAndroidAbi(undefined)).toBe("x86_64");
    expect(() => resolveShowcaseAndroidAbi("mips")).toThrow(/Unsupported/u);
  });
});

describe("showcase content assets", () => {
  it("points every fixture image at a file the control server can serve", () => {
    const urls = [
      ...SHOWCASE_WISHLISTS.map((wishlist) => wishlist.image_url),
      ...SHOWCASE_ITEMS.map((item) => item.image_url),
      ...SHOWCASE_SECRET_SANTA_LIST.items.map((event) => event.image_url),
    ].filter((url): url is string => url !== null);

    expect(urls).toHaveLength(16);
    expect(new Set(urls).size).toBe(16);
    expect(
      urls.every((url) =>
        NodeFS.existsSync(`scripts/showcase/assets/${url.slice(showcaseAssetUrl("").length)}`),
      ),
    ).toBe(true);
  });

  it("leaves one wishlist and one event without a cover, for the gradient fallback", () => {
    expect(SHOWCASE_WISHLISTS.filter((wishlist) => wishlist.image_url === null)).toHaveLength(1);
    expect(SHOWCASE_SECRET_SANTA_LIST.items.filter((e) => e.image_url === null)).toHaveLength(1);
    // Second in the list, so the gradient is actually on screen in the capture.
    expect(SHOWCASE_WISHLISTS[1]!.image_url).toBeNull();
  });

  it("renders an avatar the runner can answer from the control server", async () => {
    const png = await renderShowcaseAvatar("AM", "#F9A8D4", "#DB2777");
    expect(readPngMetadata(png).width).toBe(512);
  });

  it("renders stable illustrated portraits instead of initials", () => {
    const alex = buildShowcaseAvatarSvg("AM", "#F9A8D4", "#DB2777");
    const jamie = buildShowcaseAvatarSvg("JC", "#A5B4FC", "#4338CA");
    expect(alex).not.toContain("<text");
    expect(alex).toContain("clipPath");
    expect(alex).not.toBe(jamie);
  });

  it("excludes showcase content from EAS production archives", () => {
    expect(NodeFS.readFileSync(".easignore", "utf8")).toContain("/scripts/showcase/assets/");
  });
});
