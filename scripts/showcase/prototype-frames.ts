/**
 * Throwaway prototype: six Cal-AI-style frame treatments for the store showcase.
 *
 *     node scripts/showcase/prototype-frames.ts
 *
 * Reads bare captures from apps/native/artifacts/screenshots/google-play/phone/light
 * and falls back to re-extracting the screen out of the already-framed PNGs when the
 * captures have been cleaned up. Writes one folder per variation under
 * apps/native/artifacts/frame-prototypes/. Once a variation is picked, its background
 * and device drawing move into showcase-frames.ts and this file goes away.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import sharp from "sharp";

import { computeFrameLayout } from "./showcase-frames.ts";
import { SHOWCASE_SCENES, type ShowcaseScene } from "./showcase.config.ts";
import { showcaseSceneFileStem } from "../../packages/backend/supabase/showcase/constants.ts";

const ROOT = path.resolve(import.meta.dirname, "../..");
const CAPTURES = path.join(ROOT, "apps/native/artifacts/screenshots/google-play/phone/light");
const FRAMED = path.join(ROOT, "apps/native/artifacts/framed/google-play/phone/light");
const OUT = path.join(ROOT, "apps/native/artifacts/frame-prototypes");

const W = 1080;
const H = 1920;
const SAFE = 72; // side margin for headline text

const BLACK_FONT = "Segoe UI Black, Segoe UI, Arial Black, Helvetica, sans-serif";
const TEXT_FONT = "Segoe UI Semibold, Segoe UI, Helvetica Neue, Arial, sans-serif";

interface SceneCallout {
  /** Pre-broken so the cloud never has to guess where a line should wrap. */
  readonly lines: readonly string[];
  /** Which edge the cloud hangs off, so it breaks the device outline rather than floating inside it. */
  readonly side: "left" | "right";
  /**
   * The thing on the screen this explains, in 0–1 screen coordinates. The tail is drawn
   * from the cloud to this point, so a callout is always tied to something the reader
   * can see rather than floating as an unattached claim. Aim at the blank space beside
   * the element, never at its middle — a dot on top of the label hides the very thing
   * the cloud is drawing attention to.
   */
  readonly anchor: { x: number; y: number };
  /**
   * Where the cloud sits relative to its anchor, in fractions of the screen height.
   * Negative is above. Kept per callout so the tails point up as often as down and the
   * clouds land at different heights across the gallery.
   */
  readonly lift: number;
}

interface SceneCopy {
  readonly lines: readonly string[];
  /** Line rendered in the accent colour / under the highlighter. */
  readonly accentLine: number;
  readonly sub: string;
  /**
   * Clouds pointing at real elements of the screen behind them. Each names something
   * visible and then says what it *means* — "3 Reserved" is a number the reader can
   * already count, but that it stops two people buying the same present is the part the
   * screen cannot tell them. Restating a visible label teaches nothing; explaining it
   * is the whole job.
   */
  readonly callouts: readonly SceneCallout[];
  /** Region of the screenshot worth zooming into, in 0–1 screen coordinates. */
  readonly focus: { x: number; y: number; width: number; height: number };
}

/**
 * Headlines name the outcome the reader gets, not the feature that produces it — a
 * store listing is read in about a second, and "never guess a present again" lands in
 * that second where "friends list sync" does not.
 */
const COPY: Record<ShowcaseScene, SceneCopy> = {
  wishlists: {
    lines: ["Never lose a", "gift idea again"],
    accentLine: 1,
    sub: "Save from any shop in two taps.",
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
    focus: { x: 0.5, y: 0.168, width: 0.46, height: 0.128 },
  },
  wishlist: {
    lines: ["Get the exact", "one you wanted"],
    accentLine: 1,
    sub: "Size, colour and price saved with it.",
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
    focus: { x: 0.02, y: 0.241, width: 0.48, height: 0.062 },
  },
  "item-link": {
    lines: ["Paste a link.", "It fills itself in."],
    accentLine: 1,
    sub: "Name, photo and price, pulled from the shop.",
    callouts: [
      // Both anchors sit in the empty right-hand end of their field. Pointing at the left
      // end would drag the bubble trail across the value the reader is meant to read.
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
    focus: { x: 0.04, y: 0.402, width: 0.64, height: 0.082 },
  },
  discover: {
    lines: ["Know exactly", "what to buy them"],
    accentLine: 1,
    sub: "Every friend's list, always current.",
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
    focus: { x: 0.03, y: 0.345, width: 0.66, height: 0.068 },
  },
  friends: {
    lines: ["Never guess a", "present again"],
    accentLine: 1,
    sub: "Their lists update as they add to them.",
    callouts: [
      {
        lines: ["Nobody sees your lists", "until you accept them"],
        side: "right",
        anchor: { x: 0.757, y: 0.152 },
        lift: 0.09,
      },
      // Right side again, unusually: every row here puts its avatar and name hard against
      // the left edge, so a left-hanging cloud can only land on top of a name.
      {
        lines: ["Three lists to browse", "instead of guessing"],
        side: "right",
        anchor: { x: 0.52, y: 0.604 },
        lift: -0.105,
      },
    ],
    focus: { x: 0.06, y: 0.178, width: 0.5, height: 0.128 },
  },
  "secret-santa": {
    lines: ["Secret Santa that", "runs itself"],
    accentLine: 1,
    sub: "Draw names, set a budget, done.",
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
    focus: { x: 0.05, y: 0.366, width: 0.47, height: 0.092 },
  },
  "secret-santa-event": {
    lines: ["Names drawn.", "Nobody knows."],
    accentLine: 1,
    sub: "Everyone sees their person, and only theirs.",
    // One cloud only. The screen is already a stack of cards with nothing spare to cover,
    // and the match secrecy is the single claim worth making here.
    callouts: [
      {
        lines: ["Only you see this name.", "Everyone else sees theirs"],
        side: "right",
        anchor: { x: 0.62, y: 0.323 },
        lift: -0.115,
      },
    ],
    focus: { x: 0.075, y: 0.272, width: 0.62, height: 0.115 },
  },
};

/** V4 and V5 carry a single line of supporting copy rather than a cloud. */
function firstCalloutText(copy: SceneCopy): string {
  return copy.callouts[0]?.lines.join(" ") ?? "";
}

function escapeXml(value: string): string {
  return value.replace(
    /[&<>"']/gu,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character] ??
      character,
  );
}

/** Rough advance width; good enough to auto-fit lines and size swashes/pills. */
function measure(text: string, size: number, factor = 0.575): number {
  return text.length * size * factor;
}

function fitFontSize(lines: readonly string[], maxWidth: number, preferred: number): number {
  const widest = Math.max(...lines.map((line) => measure(line, preferred)));
  return widest <= maxWidth ? preferred : Math.floor((preferred * maxWidth) / widest);
}

interface HeadlineOptions {
  readonly lines: readonly string[];
  readonly accentLine: number;
  readonly size: number;
  readonly lineHeight: number;
  readonly baseline: number;
  readonly color: string;
  readonly accentColor: string;
  readonly font?: string;
  readonly weight?: number;
  readonly letterSpacing?: number;
}

function headlineSvg(options: HeadlineOptions): string {
  const font = options.font ?? BLACK_FONT;
  const weight = options.weight ?? 900;
  const spacing = options.letterSpacing ?? -1.5;
  return options.lines
    .map(
      (line, index) =>
        `<text x="${W / 2}" y="${options.baseline + index * options.lineHeight}" text-anchor="middle" font-family="${font}" font-size="${options.size}" font-weight="${weight}" letter-spacing="${spacing}" fill="${index === options.accentLine ? options.accentColor : options.color}">${escapeXml(line)}</text>`,
    )
    .join("\n  ");
}

interface DeviceOptions {
  readonly width: number;
  readonly bodyFill?: string;
  readonly bodyStroke?: string;
}

async function buildDevice(
  screen: Buffer,
  options: DeviceOptions,
): Promise<{ image: Buffer; width: number; height: number; radius: number }> {
  const bezel = Math.max(8, Math.round(options.width * 0.021));
  const screenWidth = options.width - bezel * 2;
  const screenHeight = Math.round((screenWidth * H) / W);
  const height = screenHeight + bezel * 2;
  const radius = Math.round(options.width * 0.115);
  const screenRadius = Math.max(4, radius - bezel);

  const scaled = await sharp(screen)
    .resize(screenWidth, screenHeight, { fit: "cover" })
    .composite([
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${screenWidth}" height="${screenHeight}"><rect width="${screenWidth}" height="${screenHeight}" rx="${screenRadius}" fill="#fff"/></svg>`,
        ),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  const body = `<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${height}">
  <rect width="${options.width}" height="${height}" rx="${radius}" fill="${options.bodyFill ?? "#141416"}" />
  <rect x="1" y="1" width="${options.width - 2}" height="${height - 2}" rx="${radius - 1}" fill="none" stroke="${options.bodyStroke ?? "#3A3A40"}" stroke-width="2" />
</svg>`;

  const image = await sharp(Buffer.from(body))
    .composite([{ input: scaled, left: bezel, top: bezel }])
    .png()
    .toBuffer();

  return { image, width: options.width, height, radius };
}

/** sharp refuses composites that fall outside the base, so clip first. */
async function clip(
  image: Buffer,
  left: number,
  top: number,
): Promise<sharp.OverlayOptions | null> {
  const meta = await sharp(image).metadata();
  const sourceLeft = Math.max(0, -left);
  const sourceTop = Math.max(0, -top);
  const width = Math.min((meta.width ?? 0) - sourceLeft, W - Math.max(0, left));
  const height = Math.min((meta.height ?? 0) - sourceTop, H - Math.max(0, top));
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

async function rotated(
  image: Buffer,
  degrees: number,
): Promise<{ image: Buffer; width: number; height: number }> {
  const out = await sharp(image)
    .rotate(degrees, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { image: out.data, width: out.info.width, height: out.info.height };
}

/** Zoomed pull-out of a screen region, matted like a floating card. */
async function buildPullOut(
  screen: Buffer,
  focus: SceneCopy["focus"],
  targetWidth: number,
): Promise<{ image: Buffer; width: number; height: number }> {
  const left = Math.round(focus.x * W);
  const top = Math.round(focus.y * H);
  const width = Math.round(focus.width * W);
  const height = Math.round(focus.height * H);
  const targetHeight = Math.round((height * targetWidth) / width);
  const radius = 36;

  const crop = await sharp(screen)
    .extract({ left, top, width, height })
    .resize(targetWidth, targetHeight)
    .composite([
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${targetWidth}" height="${targetHeight}"><rect width="${targetWidth}" height="${targetHeight}" rx="${radius}" fill="#fff"/></svg>`,
        ),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  const pad = 14;
  const cardWidth = targetWidth + pad * 2;
  const cardHeight = targetHeight + pad * 2;
  const card = `<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${cardHeight}"><rect width="${cardWidth}" height="${cardHeight}" rx="${radius + pad}" fill="#FFFFFF"/></svg>`;

  const image = await sharp(Buffer.from(card))
    .composite([{ input: crop, left: pad, top: pad }])
    .png()
    .toBuffer();

  return { image, width: cardWidth, height: cardHeight };
}

interface ShadowOptions {
  readonly blur?: number;
  readonly opacity?: number;
  readonly dy?: number;
  readonly color?: sharp.Color;
}

/**
 * librsvg ignores feGaussianBlur here, so shadows are the subject's own alpha,
 * padded, blurred and tinted. Rotated devices then get a correctly rotated shadow
 * for free.
 */
async function shadowFor(
  image: Buffer,
  left: number,
  top: number,
  options: ShadowOptions = {},
): Promise<sharp.OverlayOptions | null> {
  const blur = options.blur ?? 30;
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
    .linear(options.opacity ?? 0.3, 0)
    .png()
    .toBuffer();
  const layer = await sharp({
    create: { width, height, channels: 3, background: options.color ?? "#3B0B22" },
  })
    .joinChannel(mask)
    .png()
    .toBuffer();

  return clip(layer, left - pad, top - pad + (options.dy ?? 20));
}

type Variation = (scene: ShowcaseScene, screen: Buffer) => Promise<Buffer>;

/** V1 — bleeding device under a heavy two-tone headline. */
const bleed: Variation = async (scene, screen) => {
  const copy = COPY[scene];
  const size = fitFontSize(copy.lines, W - SAFE * 2, 92);
  const lineHeight = Math.round(size * 1.02);
  const device = await buildDevice(screen, { width: 900 });
  const deviceX = Math.round((W - device.width) / 2);
  const deviceY = 520;

  const background = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.2" y2="1">
      <stop offset="0%" stop-color="#FFF9FB" /><stop offset="100%" stop-color="#FFDDEC" />
    </linearGradient>
    <radialGradient id="blob"><stop offset="0%" stop-color="#FF6FB0" stop-opacity="0.35" /><stop offset="100%" stop-color="#FF6FB0" stop-opacity="0" /></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)" />
  <circle cx="880" cy="180" r="430" fill="url(#blob)" />
  ${headlineSvg({ lines: copy.lines, accentLine: copy.accentLine, size, lineHeight, baseline: 250, color: "#22101A", accentColor: "#E5157F" })}
</svg>`;

  const layers = [
    await shadowFor(device.image, deviceX, deviceY, { blur: 34, opacity: 0.34, dy: 26 }),
    await clip(device.image, deviceX, deviceY),
  ].filter(Boolean) as sharp.OverlayOptions[];

  return sharp(Buffer.from(background))
    .composite(layers)
    .flatten({ background: "#FFDDEC" })
    .png()
    .toBuffer();
};

/** V2 — the key UI region lifted off the screen as a zoomed card. */
const spotlight: Variation = async (scene, screen) => {
  const copy = COPY[scene];
  const size = fitFontSize(copy.lines, W - SAFE * 2, 84);
  const lineHeight = Math.round(size * 1.02);
  const device = await buildDevice(screen, { width: 760 });
  const deviceX = Math.round((W - device.width) / 2);
  const deviceY = 470;

  const bezel = Math.round(device.width * 0.021);
  const screenLeft = deviceX + bezel;
  const screenTop = deviceY + bezel;
  const screenWidth = device.width - bezel * 2;
  const screenHeight = device.height - bezel * 2;
  const ring = {
    x: screenLeft + copy.focus.x * screenWidth,
    y: screenTop + copy.focus.y * screenHeight,
    width: copy.focus.width * screenWidth,
    height: copy.focus.height * screenHeight,
  };

  const pull = await buildPullOut(screen, copy.focus, 820);
  const pullX = Math.round((W - pull.width) / 2);
  const pullY = 1440;
  const tilted = await rotated(pull.image, -2);
  const tiltedX = Math.round(pullX - (tilted.width - pull.width) / 2);
  const tiltedY = Math.round(pullY - (tilted.height - pull.height) / 2);

  const background = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="#FFFFFF" /><stop offset="100%" stop-color="#FCE3EF" />
    </linearGradient>
    <radialGradient id="blob"><stop offset="0%" stop-color="#FF3D8B" stop-opacity="0.28" /><stop offset="100%" stop-color="#FF3D8B" stop-opacity="0" /></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)" />
  <circle cx="140" cy="1500" r="520" fill="url(#blob)" />
</svg>`;

  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect x="${ring.x - 10}" y="${ring.y - 10}" width="${ring.width + 20}" height="${ring.height + 20}" rx="34" fill="none" stroke="#FF2E88" stroke-width="7" />
  <line x1="${W / 2}" y1="${ring.y + ring.height + 26}" x2="${W / 2}" y2="${pullY - 30}" stroke="#FF2E88" stroke-width="6" stroke-dasharray="16 16" stroke-linecap="round" />
</svg>`;

  const composites = [
    await shadowFor(device.image, deviceX, deviceY, { blur: 30, opacity: 0.26, dy: 22 }),
    await clip(device.image, deviceX, deviceY),
    { input: Buffer.from(overlay), left: 0, top: 0 } as sharp.OverlayOptions,
    await shadowFor(tilted.image, tiltedX, tiltedY, { blur: 26, opacity: 0.4, dy: 20 }),
    await clip(tilted.image, tiltedX, tiltedY),
  ].filter(Boolean) as sharp.OverlayOptions[];

  const withDevice = await sharp(Buffer.from(background)).composite(composites).png().toBuffer();

  const text = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  ${headlineSvg({ lines: copy.lines, accentLine: copy.accentLine, size, lineHeight, baseline: 210, color: "#22101A", accentColor: "#E5157F" })}
</svg>`;

  return sharp(withDevice)
    .composite([{ input: Buffer.from(text), left: 0, top: 0 }])
    .flatten({ background: "#FCE3EF" })
    .png()
    .toBuffer();
};

/** V3 — numbered dark chapters, so the four slots read as a sequence. */
const chapters: Variation = async (scene, screen) => {
  const copy = COPY[scene];
  const index = SHOWCASE_SCENES.indexOf(scene) + 1;
  const size = fitFontSize(copy.lines, W - SAFE * 2, 82);
  const lineHeight = Math.round(size * 1.04);
  const device = await buildDevice(screen, {
    width: 860,
    bodyFill: "#0B0509",
    bodyStroke: "#4A2233",
  });
  const deviceX = Math.round((W - device.width) / 2);
  const deviceY = 640;
  const subBaseline = 250 + lineHeight * copy.lines.length + 34;

  const pillWidth = Math.round(measure(`${index} / ${SHOWCASE_SCENES.length}`, 34, 0.62)) + 64;
  const background = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stop-color="#150710" /><stop offset="100%" stop-color="#2E0D1E" />
    </linearGradient>
    <radialGradient id="glow"><stop offset="0%" stop-color="#FF2E88" stop-opacity="0.55" /><stop offset="100%" stop-color="#FF2E88" stop-opacity="0" /></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)" />
  <ellipse cx="${W / 2}" cy="1180" rx="640" ry="560" fill="url(#glow)" />
  <text x="${W - 40}" y="440" text-anchor="end" font-family="${BLACK_FONT}" font-size="440" font-weight="900" fill="#FFFFFF" opacity="0.05">${index}</text>
  <rect x="${Math.round((W - pillWidth) / 2)}" y="118" width="${pillWidth}" height="62" rx="31" fill="#FF2E88" />
  <text x="${W / 2}" y="161" text-anchor="middle" font-family="${TEXT_FONT}" font-size="34" font-weight="700" letter-spacing="1" fill="#FFFFFF">${index} / ${SHOWCASE_SCENES.length}</text>
  ${headlineSvg({ lines: copy.lines, accentLine: copy.accentLine, size, lineHeight, baseline: 280, color: "#FFFFFF", accentColor: "#FF57A8" })}
  <text x="${W / 2}" y="${subBaseline}" text-anchor="middle" font-family="${TEXT_FONT}" font-size="36" font-weight="600" fill="#D3AFC0">${escapeXml(copy.sub)}</text>
</svg>`;

  const layers = [
    await shadowFor(device.image, deviceX, deviceY, {
      blur: 40,
      opacity: 0.65,
      dy: 24,
      color: "#000000",
    }),
    await clip(device.image, deviceX, deviceY),
  ].filter(Boolean) as sharp.OverlayOptions[];

  return sharp(Buffer.from(background))
    .composite(layers)
    .flatten({ background: "#150710" })
    .png()
    .toBuffer();
};

/** V4 — saturated brand gradient with the headline reversed out of it. */
const vivid: Variation = async (scene, screen) => {
  const copy = COPY[scene];
  const size = fitFontSize(copy.lines, W - SAFE * 2, 88);
  const lineHeight = Math.round(size * 1.02);
  const device = await buildDevice(screen, { width: 880, bodyStroke: "#FFFFFF" });
  const deviceX = Math.round((W - device.width) / 2);
  const deviceY = 600;

  const chipText = firstCalloutText(copy);
  const chipWidth = Math.round(measure(chipText, 34, 0.55)) + 72;
  const chipY = 250 + lineHeight * copy.lines.length + 6;

  const background = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FF4D96" /><stop offset="55%" stop-color="#E5157F" /><stop offset="100%" stop-color="#9C0E63" />
    </linearGradient>
    <radialGradient id="haze"><stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.3" /><stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" /></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)" />
  <circle cx="180" cy="130" r="460" fill="url(#haze)" />
  ${headlineSvg({ lines: copy.lines, accentLine: copy.accentLine, size, lineHeight, baseline: 250, color: "#FFFFFF", accentColor: "#FFD766" })}
  <rect x="${Math.round((W - chipWidth) / 2)}" y="${chipY}" width="${chipWidth}" height="66" rx="33" fill="#FFFFFF" opacity="0.2" />
  <text x="${W / 2}" y="${chipY + 45}" text-anchor="middle" font-family="${TEXT_FONT}" font-size="34" font-weight="600" fill="#FFFFFF">${escapeXml(chipText)}</text>
</svg>`;

  const layers = [
    await shadowFor(device.image, deviceX, deviceY, {
      blur: 38,
      opacity: 0.45,
      dy: 26,
      color: "#5A0736",
    }),
    await clip(device.image, deviceX, deviceY),
  ].filter(Boolean) as sharp.OverlayOptions[];

  return sharp(Buffer.from(background))
    .composite(layers)
    .flatten({ background: "#9C0E63" })
    .png()
    .toBuffer();
};

/** V5 — highlighter swash on the key phrase, tilted device, floating stat pill. */
const marker: Variation = async (scene, screen) => {
  const copy = COPY[scene];
  const size = fitFontSize(copy.lines, W - SAFE * 2 - 40, 88);
  const lineHeight = Math.round(size * 1.05);
  const device = await buildDevice(screen, { width: 820 });
  const tilt = -4;
  const tiltedDevice = await rotated(device.image, tilt);
  const centerX = W / 2;
  const centerY = 580 + device.height / 2;
  const deviceX = Math.round(centerX - tiltedDevice.width / 2);
  const deviceY = Math.round(centerY - tiltedDevice.height / 2);

  const accentBaseline = 250 + copy.accentLine * lineHeight;
  const accentWidth = measure(copy.lines[copy.accentLine] ?? "", size) + 44;
  const swash = `<g transform="rotate(-1.1 ${centerX} ${accentBaseline - size * 0.3})"><rect x="${centerX - accentWidth / 2}" y="${accentBaseline - size * 0.78}" width="${accentWidth}" height="${Math.round(size * 0.98)}" rx="${Math.round(size * 0.18)}" fill="#FF3D8B" opacity="0.3" /></g>`;

  const pillHeight = 92;
  const pillText = firstCalloutText(copy);
  const pillWidth = Math.round(measure(pillText, 36, 0.55)) + 96;
  const pillX = -30;
  const pillY = 1000;
  const pill = await sharp(
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${pillWidth}" height="${pillHeight}">
  <rect width="${pillWidth}" height="${pillHeight}" rx="${pillHeight / 2}" fill="#FFFFFF" />
  <circle cx="${pillHeight / 2 + 12}" cy="${pillHeight / 2}" r="15" fill="#FF2E88" />
  <text x="${pillHeight / 2 + 40}" y="${pillHeight / 2 + 13}" font-family="${TEXT_FONT}" font-size="36" font-weight="700" fill="#1D0F16">${escapeXml(pillText)}</text>
</svg>`),
  )
    .png()
    .toBuffer();

  const background = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#FFFCFD" />
  <circle cx="${W / 2}" cy="1780" r="820" fill="#FFE1EE" />
  ${swash}
  ${headlineSvg({ lines: copy.lines, accentLine: -1, size, lineHeight, baseline: 250, color: "#1D0F16", accentColor: "#1D0F16" })}
</svg>`;

  const layers = [
    await shadowFor(tiltedDevice.image, deviceX, deviceY, { blur: 34, opacity: 0.3, dy: 26 }),
    await clip(tiltedDevice.image, deviceX, deviceY),
    await shadowFor(pill, pillX, pillY, { blur: 16, opacity: 0.28, dy: 12 }),
    await clip(pill, pillX, pillY),
  ].filter(Boolean) as sharp.OverlayOptions[];

  return sharp(Buffer.from(background))
    .composite(layers)
    .flatten({ background: "#FFFCFD" })
    .png()
    .toBuffer();
};

/**
 * Height a device of this width occupies, bezels included, so a layout can solve for
 * the width that exactly fills the space left over after the headline.
 */
const DEVICE_HEIGHT_PER_WIDTH = (1 - 0.021 * 2) * (H / W) + 0.021 * 2;

/**
 * Deterministic 0–1 wobble. The bumps have to look hand-drawn rather than stamped, but a
 * frame that renders differently on every run cannot be diffed, so this stands in for
 * randomness.
 */
function wobble(seed: string, index: number): number {
  let hash = 2166136261;
  for (const character of `${seed}#${index}`) {
    hash = ((hash ^ character.charCodeAt(0)) * 16777619) >>> 0;
  }
  return (hash % 1000) / 1000;
}

const CLOUD_FILL = "#FFFFFF";
const CLOUD_INK = "#1D0F16";
const CLOUD_ACCENT = "#FF2E88";

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Lobe extends Point {
  readonly r: number;
}

/**
 * Point at arc length `t` clockwise around a stadium of this size, starting where its top
 * edge leaves the left cap. Lobe centres ride this curve, and because they sit exactly on
 * the text box's own outline every notch between two lobes falls outside it — so the text
 * can never be clipped by the silhouette however the lobes are sized.
 */
function stadiumPoint(width: number, height: number, t: number): Point {
  const radius = height / 2;
  const straight = Math.max(0, width - height);
  const cap = Math.PI * radius;
  if (t < straight) return { x: radius + t, y: 0 };
  if (t < straight + cap) {
    const angle = -Math.PI / 2 + (t - straight) / radius;
    return { x: width - radius + radius * Math.cos(angle), y: radius + radius * Math.sin(angle) };
  }
  if (t < 2 * straight + cap) return { x: width - radius - (t - straight - cap), y: height };
  const angle = Math.PI / 2 + (t - 2 * straight - cap) / radius;
  return { x: radius + radius * Math.cos(angle), y: radius + radius * Math.sin(angle) };
}

/** Where two overlapping lobes cross on the outside, i.e. furthest from `away`. */
function lobeCrossing(a: Lobe, b: Lobe, away: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const span = Math.hypot(dx, dy);
  const along = (span * span + a.r * a.r - b.r * b.r) / (2 * span);
  const off = Math.sqrt(Math.max(0, a.r * a.r - along * along));
  const base = { x: a.x + (along * dx) / span, y: a.y + (along * dy) / span };
  const perpendicular = { x: -dy / span, y: dx / span };
  const outward = { x: base.x + off * perpendicular.x, y: base.y + off * perpendicular.y };
  const inward = { x: base.x - off * perpendicular.x, y: base.y - off * perpendicular.y };
  return Math.hypot(outward.x - away.x, outward.y - away.y) >=
    Math.hypot(inward.x - away.x, inward.y - away.y)
    ? outward
    : inward;
}

/**
 * The outline of a union of overlapping circles, as one closed path: each lobe contributes
 * the single arc running between where it crosses the lobe before it and the lobe after
 * it. Twemoji's thought balloon (U+1F4AD) is drawn exactly this way — one path of arcs for
 * the body, separate circles only for the trail — and Font Awesome's cloud is the same
 * idea with a flat base. Tracing the outline instead of stacking discs means there is one
 * shape rather than a dozen, no interior seams to hide behind an opaque fill, and a stroke
 * would follow the silhouette if one is ever wanted.
 */
function cloudPath(lobes: readonly Lobe[], centre: Point): string {
  const crossings = lobes.map((lobe, index) =>
    lobeCrossing(lobe, lobes[(index + 1) % lobes.length]!, centre),
  );
  const start = crossings[crossings.length - 1]!;
  const arcs = lobes.map((lobe, index) => {
    const from = crossings[(index + lobes.length - 1) % lobes.length]!;
    const to = crossings[index]!;
    const turn =
      Math.atan2(to.y - lobe.y, to.x - lobe.x) - Math.atan2(from.y - lobe.y, from.x - lobe.x);
    // Lobes are ordered clockwise on screen, so sweep is always 1; whether the exposed arc
    // is the major one depends on how much of the lobe its neighbours cover.
    const clockwise = ((turn % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const radius = lobe.r.toFixed(2);
    return `A${radius} ${radius} 0 ${clockwise > Math.PI ? 1 : 0} 1 ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
  });
  return `M${start.x.toFixed(2)} ${start.y.toFixed(2)}${arcs.join("")}Z`;
}

interface Cloud {
  readonly image: Buffer;
  readonly width: number;
  readonly height: number;
  /** Distance from the cloud's bounding box to its text body, so a tail starts on the body. */
  readonly inset: number;
}

/** A speech cloud sized to its text: one path, one shape. */
async function buildCloud(lines: readonly string[], seed: string): Promise<Cloud> {
  const fontSize = 30;
  const lineHeight = 40;
  // Tight, because the body is only the ring the lobes are seated on — it is never drawn.
  // The visible breathing room is the notch between two lobes, which sits a further
  // sqrt(r² - (spacing/2)²) outside this box, so the text is generously clear of the
  // silhouette even with almost no padding of its own.
  const padX = 12;
  const padY = 4;
  const bodyWidth =
    Math.round(Math.max(...lines.map((line) => measure(line, fontSize, 0.56)))) + padX * 2;
  const bodyHeight = lines.length * lineHeight + padY * 2;

  // Scaled off the body, so shrinking the padding shrinks the whole cloud without
  // flattening its puff into a finely scalloped pill.
  const baseRadius = bodyHeight * 0.42;
  // Puffier above than below, the way the weather-cloud icons are drawn.
  const rise = 1.09;
  const fall = 0.9;
  const wobbleRange = 0.3;
  const inset = Math.ceil(baseRadius * rise * (0.85 + wobbleRange)) + 2;

  const perimeter = 2 * Math.max(0, bodyWidth - bodyHeight) + Math.PI * bodyHeight;
  const count = Math.max(8, Math.round(perimeter / (baseRadius * 1.5)));
  const lobes: Lobe[] = Array.from({ length: count }, (_, index) => {
    const seat = stadiumPoint(bodyWidth, bodyHeight, (perimeter * index) / count);
    return {
      x: seat.x + inset,
      y: seat.y + inset,
      r: baseRadius * (seat.y < bodyHeight / 2 ? rise : fall) * (0.85 + wobble(seed, index) * wobbleRange),
    };
  });

  const width = bodyWidth + inset * 2;
  const height = bodyHeight + inset * 2;
  const path = cloudPath(lobes, { x: width / 2, y: height / 2 });

  const text = lines
    .map((line, index) => {
      const baseline =
        inset + padY + lineHeight * (index + 0.5) + fontSize * 0.36 - (lineHeight - fontSize) / 2;
      return `<text x="${inset + bodyWidth / 2}" y="${baseline.toFixed(1)}" text-anchor="middle" font-family="${TEXT_FONT}" font-size="${fontSize}" font-weight="700" fill="${CLOUD_INK}">${escapeXml(line)}</text>`;
    })
    .join("\n  ");

  const image = await sharp(
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <path d="${path}" fill="${CLOUD_FILL}" />
  ${text}
</svg>`),
  )
    .png()
    .toBuffer();

  return { image, width, height, inset };
}

interface ScreenRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * One callout drawn onto its own full-canvas layer: the cloud, the shrinking bubbles
 * that carry it back to the element it is about, and a dot on that element. Keeping the
 * whole callout in one layer means a single shadow pass covers the cloud and its tail,
 * so the trail keeps reading as one object over whatever it crosses.
 */
async function buildCallout(callout: SceneCallout, screen: ScreenRect): Promise<Buffer> {
  const cloud = await buildCloud(callout.lines, callout.lines.join("|"));
  const anchorX = screen.left + callout.anchor.x * screen.width;
  const anchorY = screen.top + callout.anchor.y * screen.height;

  // Kept whole inside the canvas. A pill could bleed off the edge and still look
  // deliberate, but a lobe sliced flat by the frame edge just looks like a clipping bug.
  // The cloud still breaks the device outline, which is what made the overhang worth
  // having — the phone is narrower than the frame.
  const margin = 10;
  const left = callout.side === "left" ? margin : W - cloud.width - margin;
  const wanted = anchorY + callout.lift * screen.height - cloud.height / 2;
  const top = Math.round(Math.min(Math.max(wanted, 24), H - cloud.height - 24));

  // Leave from the body's inner face, so the first bubble is never stranded in the
  // transparent corner of the cloud's bounding box.
  const fromX = callout.side === "left" ? left + cloud.width - cloud.inset : left + cloud.inset;
  const fromY = top + cloud.height / 2;

  const bubbles = [
    { at: 0.3, radius: 19 },
    { at: 0.56, radius: 12.5 },
    { at: 0.8, radius: 8 },
  ]
    .map(
      (bubble) =>
        `<circle cx="${(fromX + (anchorX - fromX) * bubble.at).toFixed(1)}" cy="${(fromY + (anchorY - fromY) * bubble.at).toFixed(1)}" r="${bubble.radius}" fill="${CLOUD_FILL}" />`,
    )
    .join("\n  ");

  const tail = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  ${bubbles}
  <circle cx="${anchorX.toFixed(1)}" cy="${anchorY.toFixed(1)}" r="12" fill="${CLOUD_FILL}" />
  <circle cx="${anchorX.toFixed(1)}" cy="${anchorY.toFixed(1)}" r="7" fill="${CLOUD_ACCENT}" />
</svg>`;

  const placed = await clip(cloud.image, left, top);
  return sharp(Buffer.from(tail))
    .composite(placed ? [placed] : [])
    .png()
    .toBuffer();
}

/**
 * V6 — V5's highlighter headline over a whole device, annotated with speech clouds. The
 * device is sized from the space the headline leaves, so the phone is always complete.
 * Each cloud trails bubbles back to the element it explains: a floating claim beside a
 * screenshot makes the reader hunt for what it refers to, and a zoomed pull-out only
 * reprinted something already legible.
 */
const marked: Variation = async (scene, screen) => {
  const copy = COPY[scene];
  const size = fitFontSize(copy.lines, W - 128, 78);
  const lineHeight = Math.round(size * 1.06);
  const baseline = 138;
  const headlineBottom = baseline + (copy.lines.length - 1) * lineHeight + Math.round(size * 0.28);

  const topGap = 34;
  const bottomMargin = 44;
  const deviceTop = headlineBottom + topGap;
  const available = H - deviceTop - bottomMargin;
  const deviceWidth = Math.min(W - 80, Math.floor(available / DEVICE_HEIGHT_PER_WIDTH));
  const device = await buildDevice(screen, { width: deviceWidth });
  const deviceX = Math.round((W - device.width) / 2);
  const deviceY = deviceTop + Math.max(0, Math.round((available - device.height) / 2));

  const accentBaseline = baseline + copy.accentLine * lineHeight;
  const accentWidth = measure(copy.lines[copy.accentLine] ?? "", size) + 40;
  const swash = `<g transform="rotate(-1.1 ${W / 2} ${accentBaseline - size * 0.3})"><rect x="${W / 2 - accentWidth / 2}" y="${accentBaseline - size * 0.78}" width="${accentWidth}" height="${Math.round(size * 0.98)}" rx="${Math.round(size * 0.18)}" fill="#FF3D8B" opacity="0.3" /></g>`;

  const background = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#FFFCFD" />
  <circle cx="${W / 2}" cy="1900" r="880" fill="#FFE1EE" />
  ${swash}
  ${headlineSvg({ lines: copy.lines, accentLine: -1, size, lineHeight, baseline, color: "#1D0F16", accentColor: "#1D0F16" })}
</svg>`;

  const bezel = Math.max(8, Math.round(device.width * 0.021));
  const screenRect: ScreenRect = {
    left: deviceX + bezel,
    top: deviceY + bezel,
    width: device.width - bezel * 2,
    height: device.height - bezel * 2,
  };

  const calloutLayers: sharp.OverlayOptions[] = [];
  for (const callout of copy.callouts) {
    const layer = await buildCallout(callout, screenRect);
    const shadow = await shadowFor(layer, 0, 0, { blur: 14, opacity: 0.24, dy: 10 });
    if (shadow) calloutLayers.push(shadow);
    calloutLayers.push({ input: layer, left: 0, top: 0 });
  }

  const layers = [
    await shadowFor(device.image, deviceX, deviceY, { blur: 32, opacity: 0.28, dy: 24 }),
    await clip(device.image, deviceX, deviceY),
    ...calloutLayers,
  ].filter(Boolean) as sharp.OverlayOptions[];

  return sharp(Buffer.from(background))
    .composite(layers)
    .flatten({ background: "#FFFCFD" })
    .png()
    .toBuffer();
};

const VARIATIONS: ReadonlyArray<{ id: string; name: string; render: Variation }> = [
  { id: "v1-bleed", name: "Bleed", render: bleed },
  { id: "v2-spotlight", name: "Spotlight", render: spotlight },
  { id: "v3-chapters", name: "Chapters", render: chapters },
  { id: "v4-vivid", name: "Vivid", render: vivid },
  { id: "v5-marker", name: "Marker", render: marker },
  { id: "v6-marked-spotlight", name: "Marked (full-height + edge pills)", render: marked },
];

/**
 * Prefer the bare capture. When it is gone, lift the screen back out of the framed
 * PNG so the prototypes can be re-rendered without booting an emulator.
 */
async function loadScreen(scene: ShowcaseScene): Promise<Buffer | null> {
  const capture = path.join(CAPTURES, `${showcaseSceneFileStem(scene)}.png`);
  if (existsSync(capture))
    return sharp(await readFile(capture))
      .resize(W, H)
      .png()
      .toBuffer();

  const framedPath = path.join(FRAMED, `${showcaseSceneFileStem(scene)}.png`);
  // A scene added since the last capture simply has no source yet.
  if (!existsSync(framedPath)) return null;

  const layout = computeFrameLayout({ store: "google-play", width: W, height: H }, 2);
  return sharp(await readFile(framedPath))
    .extract({
      left: layout.screenX,
      top: layout.screenY,
      width: layout.screenWidth,
      height: layout.screenHeight,
    })
    .resize(W, H)
    .png()
    .toBuffer();
}

async function main(): Promise<void> {
  const screens = new Map<ShowcaseScene, Buffer>();
  for (const scene of SHOWCASE_SCENES) {
    const screen = await loadScreen(scene);
    if (screen) screens.set(scene, screen);
  }

  const missing = SHOWCASE_SCENES.filter((scene) => !screens.has(scene));
  let written = 0;

  for (const variation of VARIATIONS) {
    const directory = path.join(OUT, variation.id);
    await mkdir(directory, { recursive: true });
    for (const [scene, screen] of screens) {
      const name = `${showcaseSceneFileStem(scene)}.png`;
      await writeFile(path.join(directory, name), await variation.render(scene, screen));
      written += 1;
    }
    console.log(`${variation.id.padEnd(20)} ${variation.name}`);
  }

  if (missing.length > 0) {
    console.log(`\nSkipped (no capture yet): ${missing.join(", ")}`);
  }
  console.log(`\nWrote ${written} images to ${OUT}`);
}

await main();
