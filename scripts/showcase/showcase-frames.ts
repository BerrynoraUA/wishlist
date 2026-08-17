import sharp from "sharp";

import { normalizeStorePng } from "./showcase-images.ts";
import type {
  ShowcaseAppearance,
  ShowcaseCallout,
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
 * the whole phone below it sized to whatever room is left, and speech clouds trailing
 * bubbles back to the element each one explains.
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

/** Rough advance width. Good enough to auto-fit a headline and size a cloud to its text. */
function measure(text: string, size: number, factor = 0.575): number {
  return text.length * size * factor;
}

/** Shrinks a headline that would otherwise run past the margins — a translated one will. */
export function fitFontSize(lines: readonly string[], maxWidth: number, preferred: number): number {
  const widest = Math.max(...lines.map((line) => measure(line, preferred)));
  return widest <= maxWidth ? preferred : Math.floor((preferred * maxWidth) / widest);
}

/**
 * Deterministic 0–1 wobble. Cloud lobes have to look hand-drawn rather than stamped, but a
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
export function cloudPath(lobes: readonly Lobe[], centre: Point): string {
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
async function buildCloud(
  lines: readonly string[],
  layout: FrameLayout,
  frames: ShowcaseFrameConfig,
): Promise<Cloud> {
  const seed = lines.join("|");
  const fontSize = Math.round(30 * layout.scale);
  const lineHeight = Math.round(fontSize * 1.333);
  // The body is only the ring the lobes are seated on — it is never drawn — so its padding
  // is almost nothing and the puff supplies the breathing room instead.
  const padX = Math.round(12 * layout.scale);
  const padY = Math.round(4 * layout.scale);
  const bodyWidth =
    Math.round(Math.max(...lines.map((line) => measure(line, fontSize, 0.56)))) + padX * 2;
  const bodyHeight = lines.length * lineHeight + padY * 2;

  const baseRadius = bodyHeight * 0.34;
  // Puffier above than below, the way the weather-cloud icons are drawn.
  const rise = 1.09;
  const fall = 0.9;
  const wobbleRange = 0.3;
  const spacing = baseRadius * 1.35;
  const maxRadius = baseRadius * rise * (0.85 + wobbleRange);

  /**
   * The lobe ring is pulled inside the text box so the puff hugs the text rather than
   * ballooning around it. That trades away the guarantee a ring seated exactly on the box
   * would give, so the pull is capped at a fraction of the shallowest notch two lobes can
   * leave — the wobble's smallest radius at the widest spacing. Whatever the wobble does,
   * a fifth of that notch still clears the box, and the text sits inside it with its
   * padding and line leading on top.
   */
  const shallowestNotch = Math.sqrt(
    Math.max(0, (baseRadius * fall * 0.85) ** 2 - (spacing / 2) ** 2),
  );
  const seat = Math.max(0, Math.floor(Math.min(baseRadius * 0.34, shallowestNotch * 0.8)));
  const inset = Math.ceil(maxRadius) - seat + 2;

  const seatWidth = bodyWidth - seat * 2;
  const seatHeight = bodyHeight - seat * 2;
  const perimeter = 2 * Math.max(0, seatWidth - seatHeight) + Math.PI * seatHeight;
  const count = Math.max(8, Math.round(perimeter / spacing));
  const lobes: Lobe[] = Array.from({ length: count }, (_, index) => {
    const point = stadiumPoint(seatWidth, seatHeight, (perimeter * index) / count);
    return {
      x: point.x + inset + seat,
      y: point.y + inset + seat,
      r:
        baseRadius *
        (point.y < seatHeight / 2 ? rise : fall) *
        (0.85 + wobble(seed, index) * wobbleRange),
    };
  });

  const width = bodyWidth + inset * 2;
  const height = bodyHeight + inset * 2;
  const path = cloudPath(lobes, { x: width / 2, y: height / 2 });

  const text = lines
    .map((line, index) => {
      const baseline =
        inset + padY + lineHeight * (index + 0.5) + fontSize * 0.36 - (lineHeight - fontSize) / 2;
      return `<text x="${inset + bodyWidth / 2}" y="${baseline.toFixed(1)}" text-anchor="middle" font-family="${escapeXml(frames.fontFamily)}" font-size="${fontSize}" font-weight="700" fill="${CLOUD_INK}">${escapeXml(line)}</text>`;
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

/**
 * One callout drawn onto its own full-canvas layer: the cloud, the shrinking bubbles that
 * carry it back to the element it is about, and a dot on that element. Keeping the whole
 * callout in one layer means a single shadow pass covers the cloud and its tail, so the
 * trail keeps reading as one object over whatever it crosses.
 */
async function buildCallout(
  callout: ShowcaseCallout,
  layout: FrameLayout,
  frames: ShowcaseFrameConfig,
): Promise<Buffer> {
  const cloud = await buildCloud(callout.lines, layout, frames);
  const anchorX = layout.screenX + callout.anchor.x * layout.screenWidth;
  const anchorY = layout.screenY + callout.anchor.y * layout.screenHeight;

  // Kept whole inside the canvas. A pill could bleed off the edge and still look
  // deliberate, but a lobe sliced flat by the frame edge just looks like a clipping bug.
  // The cloud still breaks the device outline, which is what the bleed was for — the phone
  // is narrower than the frame.
  const margin = Math.round(10 * layout.scale);
  const edge = Math.round(24 * layout.scale);
  const left = callout.side === "left" ? margin : layout.width - cloud.width - margin;
  const wanted = anchorY + callout.lift * layout.screenHeight - cloud.height / 2;
  const top = Math.round(Math.min(Math.max(wanted, edge), layout.height - cloud.height - edge));

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
        `<circle cx="${(fromX + (anchorX - fromX) * bubble.at).toFixed(1)}" cy="${(fromY + (anchorY - fromY) * bubble.at).toFixed(1)}" r="${(bubble.radius * layout.scale).toFixed(1)}" fill="${CLOUD_FILL}" />`,
    )
    .join("\n  ");

  const tail = `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}">
  ${bubbles}
  <circle cx="${anchorX.toFixed(1)}" cy="${anchorY.toFixed(1)}" r="${(12 * layout.scale).toFixed(1)}" fill="${CLOUD_FILL}" />
  <circle cx="${anchorX.toFixed(1)}" cy="${anchorY.toFixed(1)}" r="${(7 * layout.scale).toFixed(1)}" fill="${CLOUD_ACCENT}" />
</svg>`;

  const placed = await clip(cloud.image, left, top, layout);
  return sharp(Buffer.from(tail))
    .composite(placed ? [placed] : [])
    .png()
    .toBuffer();
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
  readonly scene: ShowcaseScene;
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
    { input: Buffer.from(buildDeviceOverlaySvg(layout, options.spec.store)), left: 0, top: 0 },
  );

  for (const callout of copy.callouts) {
    const layer = await buildCallout(callout, layout, options.frames);
    const shadow = await shadowFor(layer, 0, 0, layout, {
      blur: 14 * layout.scale,
      opacity: 0.24,
      dy: Math.round(10 * layout.scale),
    });
    if (shadow) layers.push(shadow);
    layers.push({ input: layer, left: 0, top: 0 });
  }

  const framed = await sharp(
    Buffer.from(buildFrameBackgroundSvg(layout, copy.headline, options.appearance, options.frames)),
  )
    .composite(layers)
    .flatten({ background: options.frames.background[options.appearance][0] })
    .png()
    .toBuffer();

  return normalizeStorePng(framed);
}
