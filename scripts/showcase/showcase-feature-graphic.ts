import * as NodeFSP from "node:fs/promises";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

import sharp from "sharp";

import { normalizeStorePng, readPngMetadata } from "./showcase-images.ts";
import type {
  ShowcaseAppearance,
  ShowcaseFeatureGraphicSpec,
  ShowcaseFrameConfig,
} from "./showcase.config.ts";

/**
 * Google Play's feature graphic: the banner above the listing, and the only required
 * store image the screenshot pipeline did not already produce. It is a fixed 1024×500
 * landscape, so it cannot go through the 9:16 screenshot validator.
 *
 * The treatment matches the framed screenshots — same gradient, same heavy wordmark under
 * the same highlighter swash — with the artwork pushed to the right and the wordmark to
 * the left, because Play lays a round play button over the middle whenever the listing
 * also has a promo video. The artwork is three saved gifts, photographed and priced the
 * way the app shows them: abstract list rows would read as any to-do app.
 */

const ITEMS_ROOT = NodePath.resolve(
  NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)),
  "assets/content/items",
);

export interface FeatureGraphicCard {
  readonly name: string;
  readonly price: string;
  /** Any URL librsvg can load; the renderer passes the photo inline as a data URI. */
  readonly image: string;
}

/** A spread of what people save: a splurge, a small treat, something for the home. */
const CARDS = [
  { name: "Sony WH-1000XM5", price: "$399.99", asset: "sony-wh-1000xm5.jpg" },
  { name: "Soy candle", price: "$32.00", asset: "soy-candle.jpg" },
  { name: "Potted plant", price: "$45.00", asset: "potted-plant.jpg" },
] as const;

/** Staggered and tilted, like cards dropped on a table. */
const CARD_PLACEMENTS = [
  { x: 648, y: 40, angle: -5 },
  { x: 684, y: 172, angle: -1.5 },
  { x: 656, y: 304, angle: 3.5 },
] as const;

function escapeXml(value: string): string {
  return value.replace(
    /[&<>"']/gu,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character] ??
      character,
  );
}

/** Same rough advance width the framed headlines are fitted with. */
function measure(text: string, size: number, factor = 0.575): number {
  return text.length * size * factor;
}

/** A saved item: its photo, name and price, stacked at a slight angle. */
function card(
  index: number,
  item: FeatureGraphicCard,
  x: number,
  y: number,
  angle: number,
  frames: ShowcaseFrameConfig,
  ink: string,
  accent: string,
): string {
  const width = 300;
  const height = 104;
  const photo = 76;
  const centreX = x + width / 2;
  const centreY = y + height / 2;
  return `<g transform="rotate(${angle} ${centreX} ${centreY})">
    <clipPath id="photo${index}"><rect x="${x + 14}" y="${y + 14}" width="${photo}" height="${photo}" rx="16" /></clipPath>
    <rect x="${x + 4}" y="${y + 9}" width="${width}" height="${height}" rx="24" fill="#B4145E" opacity="0.13" />
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="24" fill="#FFFFFF" />
    <image x="${x + 14}" y="${y + 14}" width="${photo}" height="${photo}" preserveAspectRatio="xMidYMid slice" clip-path="url(#photo${index})" href="${escapeXml(item.image)}" />
    <text x="${x + 106}" y="${y + 46}" font-family="${escapeXml(frames.fontFamily)}" font-size="19" font-weight="700" fill="${ink}">${escapeXml(item.name)}</text>
    <text x="${x + 106}" y="${y + 76}" font-family="${escapeXml(frames.fontFamily)}" font-size="19" font-weight="700" fill="${accent}">${escapeXml(item.price)}</text>
  </g>`;
}

export function buildFeatureGraphicSvg(
  spec: ShowcaseFeatureGraphicSpec,
  appearance: ShowcaseAppearance,
  frames: ShowcaseFrameConfig,
  cards: readonly FeatureGraphicCard[],
): string {
  const { width, height } = spec;
  const [from, to] = frames.background[appearance];
  const ink = frames.captionColor[appearance];
  const accent = frames.accentColor[appearance];

  // Everything readable lives in the left half; the right half carries the artwork. Play
  // crops this banner at some listing sizes, so the text block is held well inboard of
  // the edge rather than run out to the margin the screenshots use.
  const textLeft = 96;
  const wordmarkSize = 96;
  const wordmarkBaseline = 248;
  const taglineSize = 32;
  const taglineBaseline = 312;

  const swashWidth = measure(spec.wordmark, wordmarkSize) + 44;
  const swash = `<g transform="rotate(-1.1 ${textLeft + swashWidth / 2} ${wordmarkBaseline - wordmarkSize * 0.3})"><rect x="${textLeft - 18}" y="${wordmarkBaseline - wordmarkSize * 0.78}" width="${swashWidth}" height="${Math.round(wordmarkSize * 0.98)}" rx="${Math.round(wordmarkSize * 0.18)}" fill="${accent}" opacity="0.3" /></g>`;

  // The framed screenshots get their wash from an oversized circle, which at 9:19.5 reads
  // as a soft band. At 1024×500 that same circle cuts a hard arc across the corner, so
  // the banner uses a true gradient with no visible edge.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <radialGradient id="wash" cx="0.68" cy="0.95" r="1.05">
      <stop offset="0" stop-color="${to}" />
      <stop offset="1" stop-color="${from}" />
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#wash)" />
  ${cards
    .slice(0, CARD_PLACEMENTS.length)
    .map((item, index) => {
      const { x, y, angle } = CARD_PLACEMENTS[index]!;
      return card(index, item, x, y, angle, frames, ink, accent);
    })
    .join("\n  ")}
  ${swash}
  <text x="${textLeft}" y="${wordmarkBaseline}" font-family="${escapeXml(frames.headlineFontFamily)}" font-size="${wordmarkSize}" font-weight="900" letter-spacing="-3" fill="${ink}">${escapeXml(spec.wordmark)}</text>
  <text x="${textLeft}" y="${taglineBaseline}" font-family="${escapeXml(frames.fontFamily)}" font-size="${taglineSize}" font-weight="700" fill="${ink}" opacity="0.72">${escapeXml(spec.tagline)}</text>
</svg>`;
}

export async function renderFeatureGraphic(options: {
  readonly spec: ShowcaseFeatureGraphicSpec;
  readonly appearance: ShowcaseAppearance;
  readonly frames: ShowcaseFrameConfig;
}): Promise<Buffer> {
  const cards = await Promise.all(
    CARDS.map(async (item) => ({
      name: item.name,
      price: item.price,
      image: `data:image/jpeg;base64,${(await NodeFSP.readFile(NodePath.join(ITEMS_ROOT, item.asset))).toString("base64")}`,
    })),
  );
  const svg = buildFeatureGraphicSvg(options.spec, options.appearance, options.frames, cards);
  const rendered = await sharp(Buffer.from(svg))
    .flatten({ background: options.frames.background[options.appearance][0] })
    .png()
    .toBuffer();
  return normalizeStorePng(rendered);
}

/**
 * Play states the feature graphic's size exactly and rejects an alpha channel, so it is
 * checked on the same terms as the screenshots — just not against their aspect rule.
 */
export function validateFeatureGraphic(
  spec: ShowcaseFeatureGraphicSpec,
  bytes: Uint8Array,
  label = "Feature graphic",
): void {
  const metadata = readPngMetadata(bytes);
  if (metadata.width !== spec.width || metadata.height !== spec.height) {
    throw new Error(
      `${label} is ${metadata.width}×${metadata.height}; Google Play requires ${spec.width}×${spec.height}.`,
    );
  }
  if (metadata.bitDepth !== 8 || metadata.colorType !== 2 || metadata.hasAlpha) {
    throw new Error(
      `${label} must be an 8-bit, 24-bit RGB PNG without alpha (found bit depth ${metadata.bitDepth}, color type ${metadata.colorType}).`,
    );
  }
  if (bytes.byteLength > spec.maximumFileSizeBytes) {
    throw new Error(
      `${label} is ${bytes.byteLength} bytes; Google Play allows at most ${spec.maximumFileSizeBytes} bytes.`,
    );
  }
}
