import * as NodeFS from "node:fs";

import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

import {
  isShowcaseAppScene,
  SHOWCASE_ITEM_LINK_URL,
  SHOWCASE_SCENES,
  SHOWCASE_SCRAPED_PRODUCT,
  SHOWCASE_SHOP_PAGE_PATH,
  SHOWCASE_WISHLIST_ID,
  showcaseAssetUrl,
  showcaseSceneFileStem,
  showcaseSceneMatchesPathname,
  showcaseSceneRoute,
} from "../../packages/backend/supabase/showcase/constants.ts";
import {
  SHOWCASE_DISCOVER_SECTIONS,
  SHOWCASE_GIFT_SUGGESTIONS,
  SHOWCASE_ITEMS,
  SHOWCASE_SECRET_SANTA_DETAILS,
  SHOWCASE_SECRET_SANTA_LIST,
  SHOWCASE_WISHLISTS,
} from "../../packages/backend/supabase/showcase/data.ts";
import {
  buildShowcaseAvatarSvg,
  buildShowcaseShopPage,
  renderShowcaseAvatar,
  startShowcaseControlServer,
} from "./showcase-control-server.ts";
import {
  buildFeatureGraphicSvg,
  renderFeatureGraphic,
  validateFeatureGraphic,
} from "./showcase-feature-graphic.ts";
import {
  buildDeviceOverlaySvg,
  buildFrameBackgroundSvg,
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
  parseAndroidUiNodes,
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
      "share",
      "--scene",
      "discover",
      "--skip-build",
      "--no-frames",
    ]);
    expect([...options.deviceIds]).toEqual(["pixel"]);
    expect([...options.scenes].sort()).toEqual(["discover", "share"]);
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

  it("draws each device's own camera cutout", () => {
    const island = buildDeviceOverlaySvg(computeFrameLayout(APPLE_SPEC, 1), "dynamic-island");
    const notch = buildDeviceOverlaySvg(computeFrameLayout(APPLE_SPEC, 1), "notch");
    const android = buildDeviceOverlaySvg(computeFrameLayout(PLAY_SPEC, 1), "punch-hole");
    expect(island).toContain("<circle");
    expect(island).not.toContain("<path");
    expect(notch).toContain("<path");
    expect(notch).not.toContain("<circle");
    expect(android.match(/<circle/gu)).toHaveLength(2);
  });

  it("matches the cutout to the simulator each iPhone slot is captured on", () => {
    const cutouts = Object.fromEntries(
      showcaseConfig.devices.flatMap((device) =>
        device.platform === "ios" ? [[device.id, device.cutout]] : [],
      ),
    );
    expect(cutouts).toStrictEqual({ "iphone-6.9": "dynamic-island", "iphone-6.5": "notch" });
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

describe("scene copy", () => {
  it("gives every scene a two-line headline of its own", () => {
    const headlines = SHOWCASE_SCENES.map((scene) => showcaseConfig.frames.scenes[scene].headline);
    for (const headline of headlines) expect(headline).toHaveLength(2);
    expect(new Set(headlines.map((headline) => headline.join(" "))).size).toBe(headlines.length);
  });
});

describe("play feature graphic", () => {
  const spec = showcaseConfig.frames.featureGraphic;

  it("matches the size Google Play fixes for the listing banner", () => {
    expect([spec.width, spec.height]).toEqual([1024, 500]);
  });

  const cards = [
    { name: "Sony WH-1000XM5", price: "$399.99", image: "data:image/jpeg;base64," },
  ] as const;

  it("keeps the wordmark and tagline clear of the edges Play may crop", () => {
    const svg = buildFeatureGraphicSvg(spec, "light", showcaseConfig.frames, cards);
    expect(svg).toContain(spec.wordmark);
    expect(svg).toContain(spec.tagline);
    // Every <text> starts at least 5% in from the left edge.
    const xs = [...svg.matchAll(/<text x="(\d+(?:\.\d+)?)"/gu)].map((m) => Number(m[1]));
    expect(xs.length).toBeGreaterThan(0);
    for (const x of xs) expect(x).toBeGreaterThanOrEqual(spec.width * 0.05);
  });

  it("renders an alpha-free RGB png that passes its own validator", async () => {
    const graphic = await renderFeatureGraphic({
      spec,
      appearance: "light",
      frames: showcaseConfig.frames,
    });
    expect(() => validateFeatureGraphic(spec, graphic)).not.toThrow();
  });

  it("shows saved gifts with their photo and price rather than placeholder rows", () => {
    const svg = buildFeatureGraphicSvg(spec, "light", showcaseConfig.frames, cards);
    expect(svg).toContain("<image");
    expect(svg).toContain("$399.99");
  });

  it("carries the listing's English subtitle as its tagline", () => {
    const listing = JSON.parse(
      NodeFS.readFileSync("apps/native/store/listings/en.json", "utf8"),
    ) as { subtitle: string };
    expect(spec.tagline).toBe(listing.subtitle);
  });

  it("rejects a graphic that is not the size Play asks for", () => {
    const wrong = PNG.sync.write(new PNG({ width: 800, height: 400 }), {
      bitDepth: 8,
      colorType: 2,
      inputColorType: 6,
      inputHasAlpha: true,
    });
    expect(() => validateFeatureGraphic(spec, wrong)).toThrow(/requires 1024×500/u);
  });
});

describe("control channel", () => {
  // Not the harness port, so a test never talks to a capture running beside it.
  const PORT = 8391;
  const ORIGIN = `http://127.0.0.1:${PORT}`;

  const poll = (client: string) => fetch(`${ORIGIN}/scene?client=${client}`);
  const report = (client: string, scene: string) =>
    fetch(`${ORIGIN}/ready`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scene, client }),
    });

  it("only counts readiness from the app the current capture launched", async () => {
    const control = await startShowcaseControlServer(PORT);
    try {
      control.beginDevice();
      control.requestScene("wishlists");
      await poll("launch-a");
      await report("launch-a", "wishlists");
      await expect(control.waitForScene("wishlists", 1_000)).resolves.toBeUndefined();

      // Next device. The one just captured stays booted, keeps polling, and answers
      // this scene within a second — long before the new device has even booted.
      control.beginDevice();
      control.requestScene("discover");
      await poll("launch-a");
      await report("launch-a", "discover");
      await expect(control.waitForScene("discover", 300)).rejects.toThrow(
        /no app claimed the control channel/u,
      );

      await poll("launch-b");
      await report("launch-b", "discover");
      await expect(control.waitForScene("discover", 1_000)).resolves.toBeUndefined();
    } finally {
      await control.close();
    }
  });

  it("serves the product page the share scene opens", async () => {
    // Its own port: fetch keeps sockets alive, and one left over from the server above
    // would be reset when reused.
    const control = await startShowcaseControlServer(PORT + 1);
    try {
      const response = await fetch(`http://127.0.0.1:${PORT + 1}${SHOWCASE_SHOP_PAGE_PATH}`);
      expect(response.headers.get("content-type")).toContain("text/html");
      expect(await response.text()).toBe(buildShowcaseShopPage());
    } finally {
      await control.close();
    }
  });
});

describe("share scene", () => {
  const page = buildShowcaseShopPage();

  it("shares the product the create-from-link scene fills in", () => {
    expect(page).toContain(SHOWCASE_SCRAPED_PRODUCT.title);
    expect(page).toContain(JSON.stringify(SHOWCASE_ITEM_LINK_URL));
    expect(page).toContain(`$${SHOWCASE_SCRAPED_PRODUCT.price}`);
    expect(page).toContain("navigator.share");
  });

  it("snaps its photo to the top so the collapsed toolbar hides the loopback address", () => {
    expect(page).toContain("scroll-snap-type: y mandatory");
    expect(page).not.toContain("127.0.0.1");
  });

  it("is never asked of the app, which has no route for it", () => {
    expect(isShowcaseAppScene("share")).toBe(false);
    expect(SHOWCASE_SCENES.filter(isShowcaseAppScene)).not.toContain("share");
  });

  it("is left out of the App Store galleries, which cannot drive Safari's sheet", () => {
    for (const device of showcaseConfig.devices) {
      expect(device.scenes.includes("share")).toBe(device.platform === "android");
    }
  });

  it("reads share-sheet targets and their bounds out of a uiautomator dump", () => {
    const nodes = parseAndroidUiNodes(
      `<?xml version='1.0'?><hierarchy><node text="" content-desc="" bounds="[0,0][1080,1920]"><node text="Wishlane" content-desc="" bounds="[240,1500][400,1740]" /><node text="Fig &amp; cedar" content-desc="Copy" bounds="[10,20][30,40]" /></node></hierarchy>`,
    );
    expect(nodes).toHaveLength(3);
    expect(nodes[0]).toMatchObject({ right: 1080, bottom: 1920 });
    expect(nodes[1]).toMatchObject({ text: "Wishlane", left: 240, top: 1500, right: 400 });
    expect(nodes[2]).toMatchObject({ text: "Fig & cedar", description: "Copy" });
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
    expect(showcaseSceneMatchesPathname("discover", "/wishlists/discover/")).toBe(true);
  });
});

describe("gallery ordering", () => {
  it("numbers every scene from its position in the store order", () => {
    expect(showcaseSceneFileStem(SHOWCASE_SCENES[0])).toBe(`01-${SHOWCASE_SCENES[0]}`);
    expect(showcaseSceneFileStem(SHOWCASE_SCENES[1]!)).toBe(`02-${SHOWCASE_SCENES[1]}`);
  });

  it("sorts lexicographically into the declared order, which is how both consoles read it", () => {
    const names = SHOWCASE_SCENES.map((scene) => `${showcaseSceneFileStem(scene)}.png`);
    expect([...names].sort()).toStrictEqual(names);
  });

  it("leads the gallery with the scenes that carry the pitch", () => {
    expect(SHOWCASE_SCENES.slice(0, 3)).toStrictEqual(["item-link", "share", "discover"]);
  });

  it("numbers a gallery that skips a scene without leaving a gap", () => {
    const gallery = SHOWCASE_SCENES.filter((scene) => scene !== "share");
    expect(gallery.map((scene) => showcaseSceneFileStem(scene, gallery).slice(0, 2))).toStrictEqual(
      gallery.map((_, index) => String(index + 1).padStart(2, "0")),
    );
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

  it("prices everything in US dollars", () => {
    const currencies = new Set([
      SHOWCASE_SCRAPED_PRODUCT.currency,
      SHOWCASE_SECRET_SANTA_DETAILS.currency,
      ...SHOWCASE_ITEMS.map((item) => item.currency),
      ...SHOWCASE_DISCOVER_SECTIONS.flatMap((section) =>
        section.items.map((item) => item.currency),
      ),
      ...SHOWCASE_SECRET_SANTA_LIST.items.map((event) => event.currency),
      ...SHOWCASE_GIFT_SUGGESTIONS.items.map((item) => item.currency),
    ]);
    expect([...currencies]).toStrictEqual(["USD"]);
  });

  it("suggests Secret Santa gifts the match actually asked for, within the budget", () => {
    const match = SHOWCASE_DISCOVER_SECTIONS.find(
      (section) => section.friend_id === SHOWCASE_SECRET_SANTA_DETAILS.my_receiver?.id,
    );
    for (const suggestion of SHOWCASE_GIFT_SUGGESTIONS.items) {
      expect(suggestion.effective_price).toBeLessThanOrEqual(
        SHOWCASE_SECRET_SANTA_DETAILS.budget ?? 0,
      );
      // Same name and same photo as on their list, so the thumbnail is the thing named.
      expect(
        match?.items.some(
          (item) => item.title === suggestion.name && item.image_url === suggestion.image_url,
        ),
      ).toBe(true);
    }
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
