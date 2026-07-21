// One-off generator for the Secret Santa tab icon template images.
// There is no SF Symbol or Material symbol for Santa, so we draw a monochrome
// Santa-hat silhouette (cone + fur brim + pom-pom) as a white/alpha template
// image. The tab bar tints it like the other symbols, and thin transparent
// gaps between the three parts keep the silhouette readable at tab size.
// Writes 1x/2x/3x PNGs to apps/native/assets/images/.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const POINT_SIZE = 30;
const MARGIN = 0.06; // fraction of the box kept clear around the silhouette
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

// --- Santa-hat geometry, authored in a normalized [0,1] box (y points down).

const quad = (p0, p1, p2, t) => {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
  ];
};

function sampleQuad(p0, p1, p2, steps) {
  const pts = [];
  for (let i = 0; i <= steps; i++) pts.push(quad(p0, p1, p2, i / steps));
  return pts;
}

// Cone: the region enclosed by a left edge curve and a right edge curve. It
// leans right and tapers toward the pom-pom for the classic slouchy hat.
const CONE_LEFT = sampleQuad([0.24, 0.62], [0.29, 0.19], [0.64, 0.22], 40);
const CONE_RIGHT = sampleQuad([0.7, 0.24], [0.68, 0.34], [0.6, 0.62], 40);
const conePolygon = [...CONE_LEFT, ...CONE_RIGHT];

// Fur brim: a rounded horizontal bar sitting under the cone base.
let brimA = [0.19, 0.73];
let brimB = [0.61, 0.73];
let brimR = 0.08;

// Pom-pom at the tip.
let pomC = [0.75, 0.17];
let pomR = 0.1;

// --- Fit the whole silhouette into the box with a uniform margin.
const bboxPts = [
  ...conePolygon,
  [brimA[0] - brimR, brimA[1]],
  [brimA[0], brimA[1] - brimR],
  [brimA[0], brimA[1] + brimR],
  [brimB[0] + brimR, brimB[1]],
  [pomC[0] - pomR, pomC[1]],
  [pomC[0] + pomR, pomC[1]],
  [pomC[0], pomC[1] - pomR],
  [pomC[0], pomC[1] + pomR],
];
const minX = Math.min(...bboxPts.map((p) => p[0]));
const maxX = Math.max(...bboxPts.map((p) => p[0]));
const minY = Math.min(...bboxPts.map((p) => p[1]));
const maxY = Math.max(...bboxPts.map((p) => p[1]));
const fit = (1 - 2 * MARGIN) / Math.max(maxX - minX, maxY - minY);
const cx = (minX + maxX) / 2;
const cy = (minY + maxY) / 2;
const T = (p) => [(p[0] - cx) * fit + 0.5, (p[1] - cy) * fit + 0.5];

const cone = conePolygon.map(T);
brimA = T(brimA);
brimB = T(brimB);
pomC = T(pomC);
brimR *= fit;
pomR *= fit;

function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Distance from (x,y) to the segment A–B. */
function segmentDistance(x, y, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy || 1;
  let t = ((x - a[0]) * dx + (y - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy));
}

function render(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const samples = 4; // supersampling grid per axis
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let coverage = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = (px + (sx + 0.5) / samples) / size;
          const y = (py + (sy + 0.5) / samples) / size;
          const inCone = pointInPolygon(x, y, cone);
          const inBrim = segmentDistance(x, y, brimA, brimB) < brimR;
          const inPom = Math.hypot(x - pomC[0], y - pomC[1]) < pomR;
          if (inCone || inBrim || inPom) coverage++;
        }
      }
      const i = (py * size + px) * 4;
      rgba[i] = 255;
      rgba[i + 1] = 255;
      rgba[i + 2] = 255;
      rgba[i + 3] = Math.round((coverage / (samples * samples)) * 255);
    }
  }
  return rgba;
}

for (const scale of [1, 2, 3]) {
  const size = POINT_SIZE * scale;
  const name = scale === 1 ? "secret-santa-tab.png" : `secret-santa-tab@${scale}x.png`;
  writeFileSync(join(OUT_DIR, name), encodePng(size, render(size)));
  console.log(`wrote ${name} (${size}x${size})`);
}
