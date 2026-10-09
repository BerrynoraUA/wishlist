// One-off generator for the oversized iOS "+" tab icon images.
// Draws a plus.circle.fill lookalike and writes 1x/2x/3x PNGs to
// apps/native/assets/images/tab-plus-<accent>*.png: an accent circle with a
// white plus, used with renderingMode="original" because iOS 26 ignores tint
// on unselected tab items.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const POINT_SIZE = 35;
const OUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "apps",
  "native",
  "assets",
  "images",
);

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Distance from point to the horizontal segment [-halfLen, halfLen] × {0}. */
function capsuleDistance(x, y, halfLen) {
  const cx = Math.min(Math.max(x, -halfLen), halfLen);
  return Math.hypot(x - cx, y);
}

/**
 * Light-mode `--color-brand` per accent from apps/native/global.css, as
 * OKLCH [L, C, h]. Used for both modes so the white plus keeps contrast.
 */
const ACCENTS = {
  pink: [0.5473, 0.2022, 351.459],
  blue: [0.5461, 0.2152, 262.881],
  peach: [0.6658, 0.1574, 58.318],
  mint: [0.596, 0.1274, 163.225],
  lavender: [0.5413, 0.2466, 293.009],
};

function oklchToSrgb([l, c, h]) {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  return linear.map((v) => {
    const x = Math.min(Math.max(v, 0), 1);
    const g = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
    return Math.round(g * 255);
  });
}

/** Renders a circle in the RGB `fill` color with an opaque white plus. */
function render(size, fill) {
  const rgba = Buffer.alloc(size * size * 4);
  const center = size / 2;
  const radius = size / 2 - 0.5;
  const armHalfLen = size * 0.2;
  const armHalfWidth = size * 0.058;
  const samples = 4; // supersampling grid per axis

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let circle = 0;
      let plus = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = px + (sx + 0.5) / samples - center;
          const y = py + (sy + 0.5) / samples - center;
          if (Math.hypot(x, y) > radius) continue;
          const inPlus =
            capsuleDistance(x, y, armHalfLen) < armHalfWidth ||
            capsuleDistance(y, x, armHalfLen) < armHalfWidth;
          circle++;
          if (inPlus) plus++;
        }
      }
      const total = samples * samples;
      const i = (py * size + px) * 4;
      // Plus is white; blend it with the fill by its share of covered samples.
      const t = circle > 0 ? plus / circle : 0;
      for (let ch = 0; ch < 3; ch++) rgba[i + ch] = Math.round(fill[ch] + (255 - fill[ch]) * t);
      rgba[i + 3] = Math.round((circle / total) * 255);
    }
  }
  return rgba;
}

for (const [accent, color] of Object.entries(ACCENTS)) {
  const base = `tab-plus-${accent}`;
  const fill = oklchToSrgb(color);
  for (const scale of [1, 2, 3]) {
    const size = POINT_SIZE * scale;
    const name = scale === 1 ? `${base}.png` : `${base}@${scale}x.png`;
    writeFileSync(join(OUT_DIR, name), encodePng(size, render(size, fill)));
    console.log(`wrote ${name} (${size}x${size})`);
  }
}
