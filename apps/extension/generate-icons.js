/**
 * Run this script with Node.js to generate PNG icons from the SVG.
 *
 *   node generate-icons.js
 *
 * Requires: npm i sharp  (or use any SVG-to-PNG tool)
 *
 * Alternatively, you can manually export icon.svg at 16×16, 32×32, 48×48,
 * and 128×128 using Figma, Inkscape, or any vector tool.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");
const path = require("path");

async function generate() {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.log("Install sharp first: npm i sharp");
    console.log("Or manually export icons/icon.svg at 16, 32, 48, 128 px.");
    process.exit(1);
  }

  const svgPath = path.join(__dirname, "icons", "icon.svg");
  const svg = fs.readFileSync(svgPath);

  for (const size of [16, 32, 48, 128]) {
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(path.join(__dirname, "icons", `icon-${size}.png`));
    console.log(`✓ icons/icon-${size}.png`);
  }
}

generate().catch(console.error);
