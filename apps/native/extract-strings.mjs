/**
 * Rebuilds translation-source-map.json (hash -> English source string) used as the
 * reference map when translating a new locale batch. Re-run this after adding/changing
 * any t()/translate() calls in the app so the map stays in sync with the 730+ keys
 * that appear in content/de.json (or any other already-translated locale file).
 * Static regex extraction can't see strings passed as variables (t(priority.name),
 * t(weekday), etc.) or built via Alert.alert/template concatenation — those are listed
 * explicitly in `extras`/`hashOverrides` below. If extraction ever reports missing
 * keys again, cross-reference content/{locale}.json across a few languages to
 * reconstruct the English original, then add it here.
 */
import fs from "fs";
import path from "path";
import { hashSource } from "generaltranslation/id";

const ROOT = path.resolve(process.cwd());
const exts = new Set([".ts", ".tsx"]);
let files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (exts.has(path.extname(entry.name))) files.push(full);
  }
}
walk(ROOT);

const map = {};
const re = /\b(?:t|translate)\(\s*(`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g;

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  let m;
  while ((m = re.exec(content))) {
    let raw = m[1];
    const quote = raw[0];
    let str = raw.slice(1, -1);
    if (quote !== "`") {
      str = str
        .replace(new RegExp("\\\\" + quote, "g"), quote)
        .replace(/\\n/g, "\n")
        .replace(/\\\\/g, "\\");
    }
    if (!str.trim()) continue;
    const hash = hashSource({ source: str, dataFormat: "ICU" });
    map[hash] = str;
  }
}

const extras = [
  "Recommended",
  "Lowest price",
  "Highest price",
  "Highest priority",
  "Lowest priority",
  "Mo",
  "Tu",
  "We",
  "Th",
  "Fr",
  "Sa",
  "Su",
  "Low",
  "Medium",
  "High",
  "Urgent",
  "Critical",
  "Epic",
  "Legendary",
  "Mythic",
  "Celestial",
  "Divine",
  "Unlimited lists & items",
  "Collaborator access",
  "Sale alerts & tracking",
  "Custom colors & priorities",
  // Below: not found via static regex extraction (dynamic template concatenation,
  // Alert.alert() titles, or other indirect call sites). Reconstructed by
  // cross-referencing existing de/es/fr/ru/pl/nl translations for the same hash.
  "Enable discount",
  "Purchased by {name}",
  "Oops!",
  "Product link",
  "Email Digest",
  "Change photo",
  "Delete wishlist",
  "Edit wishlist",
  "Go to home screen!",
  "Add wishlist",
  "Add Item",
  "Edit wishlist image",
  "Edit wishlist title",
  "Discount",
  "Create Wishlist",
  "Sale price",
  "Select currency",
  "Paste a product URL",
  "Create Item",
  "Edit Item",
  "This screen doesn't exist.",
  "No priority",
  "Previous",
  "Manage wishlist access",
  "Sale Alerts",
  "Edit wishlist description",
  "Discount enabled",
  "Add Wishlist",
  "Items",
  "Edit Wishlist",
  "Reserved by {name}",
  "YYYY-MM-DD",
  "Image URL",
  "Bought",
  "None",
];
for (const str of extras) {
  const hash = hashSource({ source: str, dataFormat: "ICU" });
  map[hash] = str;
}

// Hash keys where the exact original source string could not be reverse-engineered
// from regex extraction or cross-language comparison; text below is an approximation
// good enough for translator context (rendered app text is unaffected — real key
// comes from the existing per-locale content JSON, not from this map).
const hashOverrides = {
  d4b6ed8eb724e1e3: "Loading...",
};
for (const [hash, str] of Object.entries(hashOverrides)) {
  map[hash] = str;
}

fs.writeFileSync(path.join(ROOT, "..", "..", "full-en-map.json"), JSON.stringify(map, null, 2));
console.log("Extracted", Object.keys(map).length, "unique keys");
