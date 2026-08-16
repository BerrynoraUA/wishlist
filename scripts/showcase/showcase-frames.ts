import sharp from "sharp";

import { normalizeStorePng } from "./showcase-images.ts";
import type {
  ShowcaseAppearance,
  ShowcaseFrameConfig,
  ShowcaseStoreAssetSpec,
} from "./showcase.config.ts";

/**
 * Framed marketing assets keep the store's exact upload dimensions, so the same
 * folder can be dropped into App Store Connect or Play Console when the plain
 * captures are wanted with a caption instead of bare.
 */
export interface FrameLayout {
  readonly width: number;
  readonly height: number;
  readonly captionFontSize: number;
  readonly captionLineHeight: number;
  readonly captionBaseline: number;
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

export function computeFrameLayout(
  spec: Pick<ShowcaseStoreAssetSpec, "store" | "width" | "height">,
  captionLines: number,
): FrameLayout {
  const { width, height } = spec;
  const metrics = deviceFrameMetrics(spec.store);
  const margin = Math.round(width * 0.035);
  const bottomMargin = Math.round(height * 0.035);
  const bezel = Math.max(3, Math.round(width * 0.004));
  const captionFontSize = Math.round(width * 0.061);
  const captionLineHeight = Math.round(captionFontSize * 1.12);
  const captionBaseline = Math.round(height * 0.052) + captionFontSize;
  const deviceTop =
    captionBaseline + captionLineHeight * (captionLines - 1) + Math.round(height * 0.032);
  const maxDeviceWidth = width - margin * 2;
  const maxDeviceHeight = height - deviceTop - bottomMargin;
  const screenAspect = height / width;
  const deviceAspect =
    (screenAspect * (1 - metrics.horizontalInset * 2)) /
    (1 - metrics.topInset - metrics.bottomInset);
  const deviceWidth = Math.round(Math.min(maxDeviceWidth, maxDeviceHeight / deviceAspect));
  const deviceHeight = Math.round(deviceWidth * deviceAspect);
  const deviceX = Math.round((width - deviceWidth) / 2);
  const screenX = deviceX + Math.round(deviceWidth * metrics.horizontalInset);
  const screenY = deviceTop + Math.round(deviceHeight * metrics.topInset);
  const screenWidth = deviceWidth - (screenX - deviceX) * 2;
  const screenHeight =
    deviceHeight -
    Math.round(deviceHeight * metrics.topInset) -
    Math.round(deviceHeight * metrics.bottomInset);

  return {
    width,
    height,
    captionFontSize,
    captionLineHeight,
    captionBaseline,
    deviceX,
    deviceY: deviceTop,
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

/** Greedy wrap; captions are short marketing lines, never paragraphs. */
export function wrapCaption(caption: string, maxCharacters = 24): string[] {
  const words = caption.split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharacters && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [caption];
}

function escapeXml(value: string): string {
  return value.replace(
    /[&<>"']/gu,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character] ??
      character,
  );
}

export function buildFrameBackgroundSvg(
  layout: FrameLayout,
  captionLines: readonly string[],
  appearance: ShowcaseAppearance,
  frames: ShowcaseFrameConfig,
): string {
  const [from, to] = frames.background[appearance];
  const text = captionLines
    .map(
      (line, index) =>
        `<tspan x="${layout.width / 2}" y="${layout.captionBaseline + index * layout.captionLineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  const bodyFill = appearance === "dark" ? "#111113" : "#1C1C1E";
  const bodyStroke = appearance === "dark" ? "#4B4B50" : "#66666B";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0%" stop-color="${from}" />
      <stop offset="100%" stop-color="${to}" />
    </linearGradient>
  </defs>
  <rect width="${layout.width}" height="${layout.height}" fill="url(#bg)" />
  <text text-anchor="middle" font-family="${escapeXml(frames.fontFamily)}" font-size="${layout.captionFontSize}" font-weight="700" fill="${frames.captionColor[appearance]}">${text}</text>
  <rect x="${layout.deviceX}" y="${layout.deviceY}" width="${layout.deviceWidth}" height="${layout.deviceHeight}" rx="${layout.cornerRadius}" fill="${bodyFill}" stroke="${bodyStroke}" stroke-width="${layout.bezel}" />
</svg>`;
}

export function buildDeviceOverlaySvg(
  layout: FrameLayout,
  store: ShowcaseStoreAssetSpec["store"],
): string {
  const screenOutline = `<rect x="${layout.screenX}" y="${layout.screenY}" width="${layout.screenWidth}" height="${layout.screenHeight}" rx="${layout.screenCornerRadius}" fill="none" stroke="#08080A" stroke-width="${layout.bezel}" />`;
  const buttonWidth = Math.max(3, Math.round(layout.deviceWidth * 0.009));
  const buttonRadius = Math.max(2, Math.round(buttonWidth / 2));

  if (store === "apple") {
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
  <rect x="${islandX}" y="${islandY}" width="${islandWidth}" height="${islandHeight}" rx="${Math.round(islandHeight / 2)}" fill="#050506" />
  <circle cx="${Math.round(islandX + islandWidth * 0.82)}" cy="${Math.round(islandY + islandHeight / 2)}" r="${Math.max(2, Math.round(islandHeight * 0.16))}" fill="#151D2B" />
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
  readonly caption: string;
  readonly frames: ShowcaseFrameConfig;
}): Promise<Buffer> {
  const captionLines = wrapCaption(options.caption);
  const layout = computeFrameLayout(options.spec, captionLines.length);

  const scaled = await sharp(Buffer.from(options.screenshot))
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

  const framed = await sharp(
    Buffer.from(buildFrameBackgroundSvg(layout, captionLines, options.appearance, options.frames)),
  )
    .composite([
      { input: scaled, left: layout.screenX, top: layout.screenY },
      { input: Buffer.from(buildDeviceOverlaySvg(layout, options.spec.store)), left: 0, top: 0 },
    ])
    .flatten({ background: options.frames.background[options.appearance][1] })
    .png()
    .toBuffer();

  return normalizeStorePng(framed);
}
