/**
 * Builds gt-next runtime catalogs (public/_gt/<locale>.json, keyed by GT hash) from the
 * id-keyed translation sources in src/i18n/labels.<locale>.json.
 *
 * Source of truth:
 *   - src/i18n/labels.en.json         : { id: { en, context? } }  (English base, extracted from code)
 *   - src/i18n/labels.<locale>.json   : { id: translatedString }  (hand + native-reused translations)
 *
 * The GT runtime looks strings up by hashSource({ source, id, context, dataFormat: "ICU" }),
 * the same algorithm the gt-next compiler uses. We recompute that hash here, so translations
 * stay keyed by human-readable $id while the emitted catalog matches the runtime.
 *
 * Run: node apps/frontend/scripts/build-gt-catalogs.mjs
 */
import { hashSource } from "generaltranslation/id";
import fs from "fs";
import path from "path";
import url from "url";

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const APP = path.resolve(HERE, "..");
const I18N = path.join(APP, "src/i18n");
const OUT = path.join(APP, "public/_gt");

const labelsEn = JSON.parse(fs.readFileSync(path.join(I18N, "labels.en.json"), "utf8"));

// id -> hash (recomputed the way gt-next keys inline strings)
const idToHash = {};
for (const [id, v] of Object.entries(labelsEn)) {
  idToHash[id] = hashSource({ source: v.en, id, context: v.context, dataFormat: "ICU" });
}

const localeFiles = fs
  .readdirSync(I18N)
  .filter((f) => /^labels\.[\w-]+\.json$/.test(f) && f !== "labels.en.json");

fs.mkdirSync(OUT, { recursive: true });
let summary = [];
for (const file of localeFiles) {
  const locale = file.slice("labels.".length, -".json".length);
  const translations = JSON.parse(fs.readFileSync(path.join(I18N, file), "utf8"));
  const catalog = {};
  for (const [id, text] of Object.entries(translations)) {
    if (idToHash[id] && typeof text === "string" && text.length) catalog[idToHash[id]] = text;
  }
  fs.writeFileSync(path.join(OUT, `${locale}.json`), JSON.stringify(catalog, null, 2) + "\n");
  summary.push(`${locale}: ${Object.keys(catalog).length}`);
}
console.log("built catalogs (locale: entries):");
console.log("  " + summary.join("\n  "));
