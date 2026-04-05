/**
 * Local translation bundles under `public/_gt/` (see
 * https://generaltranslation.com/en-GB/docs/next/guides/local-tx).
 * Turbopack cannot resolve fully dynamic JSON imports; locale files are
 * enumerated explicitly while keeping one import path per locale.
 */
type TranslationsModule = { default: Record<string, unknown> };

const loaders: Record<string, () => Promise<TranslationsModule>> = {
  uk: () => import("../public/_gt/uk.json"),
};

export default async function loadTranslations(locale: string) {
  const load = loaders[locale];
  if (!load) {
    return {};
  }
  try {
    const mod = await load();
    return mod.default;
  } catch {
    return {};
  }
}
