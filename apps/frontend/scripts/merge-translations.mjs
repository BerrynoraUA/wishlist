/**
 * Merges a translation patch into the id-keyed label sources, then you re-run
 * build-gt-catalogs.mjs to emit runtime catalogs.
 *
 * Patch shape (JSON):  { "<locale>": { "<id>": "<translated>", ... }, ... }
 * Usage: node apps/frontend/scripts/merge-translations.mjs <patch.json>
 */
import fs from "fs";
import path from "path";
import url from "url";

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const I18N = path.resolve(HERE, "../src/i18n");

const patchPath = process.argv[2];
if (!patchPath) {
  console.error("usage: merge-translations.mjs <patch.json>");
  process.exit(1);
}
const patch = JSON.parse(fs.readFileSync(patchPath, "utf8"));

let changed = 0;
for (const [locale, entries] of Object.entries(patch)) {
  const file = path.join(I18N, `labels.${locale}.json`);
  const current = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  for (const [id, text] of Object.entries(entries)) {
    if (typeof text === "string" && text.length) {
      current[id] = text;
      changed++;
    }
  }
  const sorted = Object.fromEntries(Object.keys(current).sort().map((k) => [k, current[k]]));
  fs.writeFileSync(file, JSON.stringify(sorted, null, 2) + "\n");
}
console.log(`merged ${changed} translations into ${Object.keys(patch).length} locale files`);
