import sharp from "sharp";

import { normalizeStorePng } from "./showcase-images.ts";
import type {
  ShowcaseAppearance,
  ShowcaseCameraCutout,
  ShowcaseFrameConfig,
  ShowcaseScene,
  ShowcaseStoreAssetSpec,
} from "./showcase.config.ts";

/**
 * Framed marketing assets keep the store's exact upload dimensions, so the same
 * folder can be dropped into App Store Connect or Play Console when the plain
 * captures are wanted with a caption instead of bare.
 *
 * The treatment: a heavy two-line headline with a highlighter swash under its last line,
 * and the whole phone below it sized to whatever room is left.
 */
export interface FrameLayout {
  readonly width: number;
  readonly height: number;
  /** Everything tuned in pixels is multiplied by this, so a design holds at every slot. */
  readonly scale: number;
  readonly headlineFontSize: number;
  readonly headlineLineHeight: number;
  readonly headlineBaseline: number;
  readonly deviceX: number;
  readonly deviceY: number;
  readonly deviceWidth: number;
  readonly deviceHeight: number;
  readonly screenX: number;
  readonly screenY: number;
  readonly screenWidth: number;
  readonly screenHeight: number;
  readonly cornerRadius: number;
  readonly screenCornerRadius: number;
  readonly bezel: number;
}

interface DeviceFrameMetrics {
  readonly horizontalInset: number;
  readonly topInset: number;
  readonly bottomInset: number;
  readonly cornerRadius: number;
  readonly screenCornerRadius: number;
}

function deviceFrameMetrics(store: ShowcaseStoreAssetSpec["store"]): DeviceFrameMetrics {
  return store === "apple"
    ? {
        horizontalInset: 0.024,
        topInset: 0.014,
        bottomInset: 0.014,
        cornerRadius: 0.12,
        screenCornerRadius: 0.096,
      }
    : {
        horizontalInset: 0.027,
        topInset: 0.016,
        bottomInset: 0.016,
        cornerRadius: 0.105,
        screenCornerRadius: 0.082,
      };
}

/** The slot the treatment was drawn against; every pixel value below is relative to it. */
const REFERENCE_WIDTH = 1080;

export function computeFrameLayout(
  spec: Pick<ShowcaseStoreAssetSpec, "store" | "width" | "height">,
  headlineLines: number,
): FrameLayout {
  const { width, height } = spec;
  const metrics = deviceFrameMetrics(spec.store);
  const scale = width / REFERENCE_WIDTH;
  const margin = Math.round(width * 0.037);
  const bottomMargin = Math.round(height * 0.023);
  const bezel = Math.max(3, Math.round(width * 0.004));
  const headlineFontSize = Math.round(width * 0.0722);
  const headlineLineHeight = Math.round(headlineFontSize * 1.06);
  const headlineBaseline = Math.round(height * 0.0719);
  const deviceTop =
    headlineBaseline +
    headlineLineHeight * (headlineLines - 1) +
    Math.round(headlineFontSize * 0.28) +
    Math.round(height * 0.018);
  const maxDeviceWidth = width - margin * 2;
  const maxDeviceHeight = height - deviceTop - bottomMargin;
  const screenAspect = height / width;
  const deviceAspect =
    (screenAspect * (1 - metrics.horizontalInset * 2)) /
    (1 - metrics.topInset - metrics.bottomInset);
  const deviceWidth = Math.round(Math.min(maxDeviceWidth, maxDeviceHeight / deviceAspect));
  const deviceHeight = Math.round(deviceWidth * deviceAspect);
  const deviceX = Math.round((width - deviceWidth) / 2);
  // Centred in the leftover room rather than pinned under the headline, so a slot whose
  // aspect leaves slack does not hang the phone off the bottom edge.
  const deviceY = deviceTop + Math.max(0, Math.round((maxDeviceHeight - deviceHeight) / 2));
  const screenX = deviceX + Math.round(deviceWidth * metrics.horizontalInset);
  const screenY = deviceY + Math.round(deviceHeight * metrics.topInset);
  const screenWidth = deviceWidth - (screenX - deviceX) * 2;
  const screenHeight =
    deviceHeight -
    Math.round(deviceHeight * metrics.topInset) -
    Math.round(deviceHeight * metrics.bottomInset);

  return {
    width,
    height,
    scale,
    headlineFontSize,
    headlineLineHeight,
    headlineBaseline,
    deviceX,
    deviceY,
    deviceWidth,
    deviceHeight,
    screenX,
    screenY,
    screenWidth,
    screenHeight,
    cornerRadius: Math.round(deviceWidth * metrics.cornerRadius),
    screenCornerRadius: Math.round(deviceWidth * metrics.screenCornerRadius),
    bezel,
  };
}

function escapeXml(value: string): string {
  return value.replace(
    /[&<>"']/gu,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character] ??
      character,
  );
}

/** Rough advance width. Good enough to auto-fit a headline and size its swash. */
function measure(text: string, size: number, factor = 0.575): number {
  return text.length * size * factor;
}

/** Shrinks a headline that would otherwise run past the margins — a translated one will. */
export function fitFontSize(lines: readonly string[], maxWidth: number, preferred: number): number {
  const widest = Math.max(...lines.map((line) => measure(line, preferred)));
  return widest <= maxWidth ? preferred : Math.floor((preferred * maxWidth) / widest);
}

/** sharp refuses composites that fall outside the base, so clip first. */
async function clip(
  image: Buffer,
  left: number,
  top: number,
  layout: FrameLayout,
): Promise<sharp.OverlayOptions | null> {
  const meta = await sharp(image).metadata();
  const sourceLeft = Math.max(0, -left);
  const sourceTop = Math.max(0, -top);
  const width = Math.min((meta.width ?? 0) - sourceLeft, layout.width - Math.max(0, left));
  const height = Math.min((meta.height ?? 0) - sourceTop, layout.height - Math.max(0, top));
  if (width <= 0 || height <= 0) return null;

  const needsCrop =
    sourceLeft > 0 || sourceTop > 0 || width !== meta.width || height !== meta.height;
  const input = needsCrop
    ? await sharp(image)
        .extract({ left: sourceLeft, top: sourceTop, width, height })
        .png()
        .toBuffer()
    : image;
  return { input, left: Math.max(0, left), top: Math.max(0, top) };
}

interface ShadowOptions {
  readonly blur: number;
  readonly opacity: number;
  readonly dy: number;
  readonly color?: sharp.Color;
}

/**
 * librsvg ignores feGaussianBlur, so shadows are the subject's own alpha channel — padded,
 * blurred and tinted — rather than an SVG filter.
 */
async function shadowFor(
  image: Buffer,
  left: number,
  top: number,
  layout: FrameLayout,
  options: ShadowOptions,
): Promise<sharp.OverlayOptions | null> {
  const blur = options.blur;
  const pad = Math.ceil(blur * 3);
  const meta = await sharp(image).metadata();
  const width = (meta.width ?? 0) + pad * 2;
  const height = (meta.height ?? 0) + pad * 2;

  const padded = await sharp(image)
    .ensureAlpha()
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  const mask = await sharp(padded)
    .extractChannel(3)
    .blur(blur)
    .linear(options.opacity, 0)
    .png()
    .toBuffer();
  const layer = await sharp({
    create: { width, height, channels: 3, background: options.color ?? "#3B0B22" },
  })
    .joinChannel(mask)
    .png()
    .toBuffer();

  return clip(layer, left - pad, top - pad + options.dy, layout);
}

export function buildFrameBackgroundSvg(
  layout: FrameLayout,
  headline: readonly string[],
  appearance: ShowcaseAppearance,
  frames: ShowcaseFrameConfig,
): string {
  const [from, to] = frames.background[appearance];
  const size = fitFontSize(
    headline,
    layout.width - Math.round(128 * layout.scale),
    layout.headlineFontSize,
  );
  const lineHeight = Math.round(size * 1.06);
  const centre = layout.width / 2;

  // The highlighter marks the last line: the config breaks the headline by hand precisely
  // so that the phrase landing under the swash is the one worth emphasising.
  const accent = headline[headline.length - 1] ?? "";
  const accentBaseline = layout.headlineBaseline + (headline.length - 1) * lineHeight;
  const accentWidth = measure(accent, size) + 40 * layout.scale;
  const swash = `<g transform="rotate(-1.1 ${centre} ${accentBaseline - size * 0.3})"><rect x="${centre - accentWidth / 2}" y="${accentBaseline - size * 0.78}" width="${accentWidth}" height="${Math.round(size * 0.98)}" rx="${Math.round(size * 0.18)}" fill="${frames.accentColor[appearance]}" opacity="0.3" /></g>`;

  const text = headline
    .map(
      (line, index) =>
        `<text x="${centre}" y="${layout.headlineBaseline + index * lineHeight}" text-anchor="middle" font-family="${escapeXml(frames.headlineFontFamily)}" font-size="${size}" font-weight="900" letter-spacing="${-1.5 * layout.scale}" fill="${frames.captionColor[appearance]}">${escapeXml(line)}</text>`,
    )
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}">
  <rect width="${layout.width}" height="${layout.height}" fill="${from}" />
  <circle cx="${centre}" cy="${Math.round(layout.height * 0.99)}" r="${Math.round(layout.width * 0.815)}" fill="${to}" />
  ${swash}
  ${text}
</svg>`;
}

/** The phone body, on its own layer so a real blurred shadow can go underneath it. */
export function buildDeviceBodySvg(layout: FrameLayout, appearance: ShowcaseAppearance): string {
  const bodyFill = appearance === "dark" ? "#111113" : "#1C1C1E";
  const bodyStroke = appearance === "dark" ? "#4B4B50" : "#66666B";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}">
  <rect x="${layout.deviceX}" y="${layout.deviceY}" width="${layout.deviceWidth}" height="${layout.deviceHeight}" rx="${layout.cornerRadius}" fill="${bodyFill}" stroke="${bodyStroke}" stroke-width="${layout.bezel}" />
</svg>`;
}

/** The notch the pre-Dynamic Island iPhones have: a bar hanging from the top edge. */
function notchSvg(layout: FrameLayout): string {
  const width = layout.screenWidth * 0.378;
  const height = layout.screenHeight * 0.0356;
  const radius = height * 0.62;
  const fillet = height * 0.22;
  const left = layout.screenX + (layout.screenWidth - width) / 2;
  const right = left + width;
  // Starts inside the bezel so no sliver of screen shows above the bar.
  const top = layout.screenY - layout.bezel;
  const bottom = layout.screenY + height;
  const path = [
    `M${left - fillet} ${top}`,
    `L${left - fillet} ${layout.screenY}`,
    `Q${left} ${layout.screenY} ${left} ${layout.screenY + fillet}`,
    `L${left} ${bottom - radius}`,
    `Q${left} ${bottom} ${left + radius} ${bottom}`,
    `L${right - radius} ${bottom}`,
    `Q${right} ${bottom} ${right} ${bottom - radius}`,
    `L${right} ${layout.screenY + fillet}`,
    `Q${right} ${layout.screenY} ${right + fillet} ${layout.screenY}`,
    `L${right + fillet} ${top}Z`,
  ].join("");
  return `<path d="${path}" fill="#050506" />`;
}

export function buildDeviceOverlaySvg(layout: FrameLayout, cutout: ShowcaseCameraCutout): string {
  const screenOutline = `<rect x="${layout.screenX}" y="${layout.screenY}" width="${layout.screenWidth}" height="${layout.screenHeight}" rx="${layout.screenCornerRadius}" fill="none" stroke="#08080A" stroke-width="${layout.bezel}" />`;
  const buttonWidth = Math.max(3, Math.round(layout.deviceWidth * 0.009));
  const buttonRadius = Math.max(2, Math.round(buttonWidth / 2));

  if (cutout !== "punch-hole") {
    const islandWidth = Math.round(layout.screenWidth * 0.27);
    const islandHeight = Math.round(layout.screenHeight * 0.027);
    const islandX = Math.round(layout.screenX + (layout.screenWidth - islandWidth) / 2);
    const islandY = Math.round(layout.screenY + layout.screenHeight * 0.012);
    const sideX = layout.deviceX - Math.round(buttonWidth * 0.55);
    const powerX = layout.deviceX + layout.deviceWidth - Math.round(buttonWidth * 0.45);

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}">
  ${screenOutline}
  <rect x="${sideX}" y="${Math.round(layout.deviceY + layout.deviceHeight * 0.2)}" width="${buttonWidth}" height="${Math.round(layout.deviceHeight * 0.035)}" rx="${buttonRadius}" fill="#343438" />
  <rect x="${sideX}" y="${Math.round(layout.deviceY + layout.deviceHeight * 0.29)}" width="${buttonWidth}" height="${Math.round(layout.deviceHeight * 0.07)}" rx="${buttonRadius}" fill="#343438" />
  <rect x="${sideX}" y="${Math.round(layout.deviceY + layout.deviceHeight * 0.39)}" width="${buttonWidth}" height="${Math.round(layout.deviceHeight * 0.07)}" rx="${buttonRadius}" fill="#343438" />
  <rect x="${powerX}" y="${Math.round(layout.deviceY + layout.deviceHeight * 0.3)}" width="${buttonWidth}" height="${Math.round(layout.deviceHeight * 0.11)}" rx="${buttonRadius}" fill="#343438" />
  ${
    cutout === "notch"
      ? notchSvg(layout)
      : `<rect x="${islandX}" y="${islandY}" width="${islandWidth}" height="${islandHeight}" rx="${Math.round(islandHeight / 2)}" fill="#050506" />
  <circle cx="${Math.round(islandX + islandWidth * 0.82)}" cy="${Math.round(islandY + islandHeight / 2)}" r="${Math.max(2, Math.round(islandHeight * 0.16))}" fill="#151D2B" />`
  }
</svg>`;
  }

  const cameraRadius = Math.max(4, Math.round(layout.screenWidth * 0.014));
  const cameraY = Math.round(layout.screenY + layout.screenHeight * 0.018);
  const powerX = layout.deviceX + layout.deviceWidth - Math.round(buttonWidth * 0.45);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}">
  ${screenOutline}
  <rect x="${powerX}" y="${Math.round(layout.deviceY + layout.deviceHeight * 0.34)}" width="${buttonWidth}" height="${Math.round(layout.deviceHeight * 0.09)}" rx="${buttonRadius}" fill="#343438" />
  <rect x="${powerX}" y="${Math.round(layout.deviceY + layout.deviceHeight * 0.23)}" width="${buttonWidth}" height="${Math.round(layout.deviceHeight * 0.075)}" rx="${buttonRadius}" fill="#343438" />
  <circle cx="${Math.round(layout.screenX + layout.screenWidth / 2)}" cy="${cameraY}" r="${cameraRadius}" fill="#050506" />
  <circle cx="${Math.round(layout.screenX + layout.screenWidth / 2)}" cy="${cameraY}" r="${Math.max(2, Math.round(cameraRadius * 0.38))}" fill="#172033" />
</svg>`;
}

function roundedMaskSvg(width: number, height: number, radius: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" fill="#fff"/></svg>`;
}

export async function renderFramedScreenshot(options: {
  readonly screenshot: Uint8Array;
  readonly spec: ShowcaseStoreAssetSpec;
  readonly appearance: ShowcaseAppearance;
  readonly scene: ShowcaseScene;
  readonly cutout: ShowcaseCameraCutout;
  readonly frames: ShowcaseFrameConfig;
}): Promise<Buffer> {
  const copy = options.frames.scenes[options.scene];
  const layout = computeFrameLayout(options.spec, copy.headline.length);

  const screen = await sharp(Buffer.from(options.screenshot))
    .resize(layout.screenWidth, layout.screenHeight, {
      fit: "contain",
      background: options.appearance === "dark" ? "#000000" : "#FFFFFF",
    })
    .composite([
      {
        input: Buffer.from(
          roundedMaskSvg(layout.screenWidth, layout.screenHeight, layout.screenCornerRadius),
        ),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  const body = Buffer.from(buildDeviceBodySvg(layout, options.appearance));
  const layers: sharp.OverlayOptions[] = [];
  const bodyShadow = await shadowFor(body, 0, 0, layout, {
    blur: 32 * layout.scale,
    opacity: 0.28,
    dy: Math.round(24 * layout.scale),
    color: options.appearance === "dark" ? "#000000" : "#3B0B22",
  });
  if (bodyShadow) layers.push(bodyShadow);
  layers.push(
    { input: body, left: 0, top: 0 },
    { input: screen, left: layout.screenX, top: layout.screenY },
    { input: Buffer.from(buildDeviceOverlaySvg(layout, options.cutout)), left: 0, top: 0 },
  );

  const framed = await sharp(
    Buffer.from(buildFrameBackgroundSvg(layout, copy.headline, options.appearance, options.frames)),
  )
    .composite(layers)
    .flatten({ background: options.frames.background[options.appearance][0] })
    .png()
    .toBuffer();

  return normalizeStorePng(framed);
}
