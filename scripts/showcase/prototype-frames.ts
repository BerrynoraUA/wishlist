/**
 * Throwaway prototype: five Cal-AI-style frame treatments for the store showcase.
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

const ROOT = path.resolve(import.meta.dirname, "../..");
const CAPTURES = path.join(ROOT, "apps/native/artifacts/screenshots/google-play/phone/light");
const FRAMED = path.join(ROOT, "apps/native/artifacts/framed/google-play/phone/light");
const OUT = path.join(ROOT, "apps/native/artifacts/frame-prototypes");

const W = 1080;
const H = 1920;
const SAFE = 72; // side margin for headline text

const BLACK_FONT = "Segoe UI Black, Segoe UI, Arial Black, Helvetica, sans-serif";
const TEXT_FONT = "Segoe UI Semibold, Segoe UI, Helvetica Neue, Arial, sans-serif";

interface SceneCopy {
  readonly lines: readonly string[];
  /** Line rendered in the accent colour / under the highlighter. */
  readonly accentLine: number;
  readonly sub: string;
  readonly chip: string;
  /** Region of the screenshot worth zooming into, in 0–1 screen coordinates. */
  readonly focus: { x: number; y: number; width: number; height: number };
}

const COPY: Record<ShowcaseScene, SceneCopy> = {
  wishlists: {
    lines: ["The links you", "meant to keep"],
    accentLine: 1,
    sub: "Save from any shop in two taps.",
    chip: "4 lists · 12 items",
    focus: { x: 0.5, y: 0.168, width: 0.46, height: 0.128 },
  },
  wishlist: {
    lines: ["Sizes, colours,", "prices — all there"],
    accentLine: 1,
    sub: "Every detail you saved, ready to shop.",
    chip: "6 items · priorities",
    focus: { x: 0.02, y: 0.241, width: 0.48, height: 0.062 },
  },
  friends: {
    lines: ["Know what they", "actually want"],
    accentLine: 1,
    sub: "Friends' lists, always up to date.",
    chip: "5 friends · 6 mutual",
    focus: { x: 0.06, y: 0.178, width: 0.5, height: 0.128 },
  },
  "secret-santa": {
    lines: ["Secret Santa", "without the group chat"],
    accentLine: 0,
    sub: "Draw names, set a budget, done.",
    chip: "4 participants · GBP 50",
    focus: { x: 0.05, y: 0.366, width: 0.47, height: 0.092 },
  },
};

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

  const chipWidth = Math.round(measure(copy.chip, 34, 0.55)) + 72;
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
  <text x="${W / 2}" y="${chipY + 45}" text-anchor="middle" font-family="${TEXT_FONT}" font-size="34" font-weight="600" fill="#FFFFFF">${escapeXml(copy.chip)}</text>
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
  const pillWidth = Math.round(measure(copy.chip, 36, 0.55)) + 96;
  const pillX = -30;
  const pillY = 1000;
  const pill = await sharp(
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${pillWidth}" height="${pillHeight}">
  <rect width="${pillWidth}" height="${pillHeight}" rx="${pillHeight / 2}" fill="#FFFFFF" />
  <circle cx="${pillHeight / 2 + 12}" cy="${pillHeight / 2}" r="15" fill="#FF2E88" />
  <text x="${pillHeight / 2 + 40}" y="${pillHeight / 2 + 13}" font-family="${TEXT_FONT}" font-size="36" font-weight="700" fill="#1D0F16">${escapeXml(copy.chip)}</text>
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

const VARIATIONS: ReadonlyArray<{ id: string; name: string; render: Variation }> = [
  { id: "v1-bleed", name: "Bleed", render: bleed },
  { id: "v2-spotlight", name: "Spotlight", render: spotlight },
  { id: "v3-chapters", name: "Chapters", render: chapters },
  { id: "v4-vivid", name: "Vivid", render: vivid },
  { id: "v5-marker", name: "Marker", render: marker },
];

/**
 * Prefer the bare capture. When it is gone, lift the screen back out of the framed
 * PNG so the prototypes can be re-rendered without booting an emulator.
 */
async function loadScreen(scene: ShowcaseScene): Promise<Buffer> {
  const capture = path.join(CAPTURES, `${scene}.png`);
  if (existsSync(capture))
    return sharp(await readFile(capture))
      .resize(W, H)
      .png()
      .toBuffer();

  const framedPath = path.join(FRAMED, `${scene}.png`);
  if (!existsSync(framedPath)) {
    throw new Error(`No capture or framed image for '${scene}'. Run pnpm screenshots first.`);
  }
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
  for (const variation of VARIATIONS) {
    const directory = path.join(OUT, variation.id);
    await mkdir(directory, { recursive: true });
    for (const scene of SHOWCASE_SCENES) {
      const screen = await loadScreen(scene);
      const image = await variation.render(scene, screen);
      await writeFile(path.join(directory, `${scene}.png`), image);
    }
    console.log(`${variation.id.padEnd(14)} ${variation.name}`);
  }
  console.log(`\nWrote ${VARIATIONS.length * SHOWCASE_SCENES.length} images to ${OUT}`);
}

await main();
