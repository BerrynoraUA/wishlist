// One-off generator for the oversized iOS "+" tab icon template images.
// Draws a plus.circle.fill lookalike (white circle with a plus knockout) and
// writes 1x/2x/3x PNGs to apps/native/assets/images/.
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

function render(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const center = size / 2;
  const radius = size / 2 - 0.5;
  const armHalfLen = size * 0.2;
  const armHalfWidth = size * 0.058;
  const samples = 4; // supersampling grid per axis

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let coverage = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = px + (sx + 0.5) / samples - center;
          const y = py + (sy + 0.5) / samples - center;
          if (Math.hypot(x, y) > radius) continue;
          const inPlus =
            capsuleDistance(x, y, armHalfLen) < armHalfWidth ||
            capsuleDistance(y, x, armHalfLen) < armHalfWidth;
          if (!inPlus) coverage++;
        }
      }
      const alpha = Math.round((coverage / (samples * samples)) * 255);
      const i = (py * size + px) * 4;
      rgba[i] = 255;
      rgba[i + 1] = 255;
      rgba[i + 2] = 255;
      rgba[i + 3] = alpha;
    }
  }
  return rgba;
}

for (const scale of [1, 2, 3]) {
  const size = POINT_SIZE * scale;
  const name = scale === 1 ? "tab-plus.png" : `tab-plus@${scale}x.png`;
  writeFileSync(join(OUT_DIR, name), encodePng(size, render(size)));
  console.log(`wrote ${name} (${size}x${size})`);
}
