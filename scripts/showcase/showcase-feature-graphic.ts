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
 * also has a promo video.
 */

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

/** A wishlist card: a colour swatch and two text bars, stacked at a slight angle. */
function card(x: number, y: number, angle: number, swatch: string, opacity: number): string {
  const width = 286;
  const height = 96;
  const centreX = x + width / 2;
  const centreY = y + height / 2;
  return `<g transform="rotate(${angle} ${centreX} ${centreY})" opacity="${opacity}">
    <rect x="${x + 4}" y="${y + 9}" width="${width}" height="${height}" rx="22" fill="#B4145E" opacity="0.13" />
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="22" fill="#FFFFFF" />
    <rect x="${x + 22}" y="${y + 26}" width="44" height="44" rx="14" fill="${swatch}" />
    <rect x="${x + 82}" y="${y + 32}" width="150" height="13" rx="6.5" fill="#1D0F16" opacity="0.82" />
    <rect x="${x + 82}" y="${y + 57}" width="96" height="11" rx="5.5" fill="#1D0F16" opacity="0.32" />
  </g>`;
}

export function buildFeatureGraphicSvg(
  spec: ShowcaseFeatureGraphicSpec,
  appearance: ShowcaseAppearance,
  frames: ShowcaseFrameConfig,
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
  ${card(658, 44, -6, "#FF3D8B", 0.94)}
  ${card(690, 176, -1.5, "#12B886", 0.97)}
  ${card(664, 308, 4, "#7C5CFF", 1)}
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
  const svg = buildFeatureGraphicSvg(options.spec, options.appearance, options.frames);
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
