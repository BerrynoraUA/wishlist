import { I18nManager } from "react-native";

/**
 * Base language subtags that use a right-to-left script. Region/script suffixes
 * (e.g. "ar-SA", "az-Arab") are normalized to the base subtag before lookup.
 */
const RTL_LANGUAGES = new Set([
  "ar", // Arabic
  "he", // Hebrew
  "iw", // Hebrew (legacy code)
  "fa", // Persian
  "ur", // Urdu
  "ps", // Pashto
  "sd", // Sindhi
  "ug", // Uyghur
  "yi", // Yiddish
  "dv", // Divehi
]);

/**
 * Reading-direction-aware `text-align` classes. React Native's `textAlign` has
 * no logical `start`/`end` value, so the layout engine can't flip it the way it
 * flips margins/padding — these resolve it explicitly from the current direction.
 * In LTR they equal `text-left` / `text-right`, so LTR rendering is unchanged.
 */
export const TEXT_START_CLASS = I18nManager.isRTL ? "text-right" : "text-left";
export const TEXT_END_CLASS = I18nManager.isRTL ? "text-left" : "text-right";

export function isRtlLocale(locale: string | null | undefined): boolean {
  if (!locale) return false;
  const base = locale.toLowerCase().split(/[-_]/)[0];
  return RTL_LANGUAGES.has(base);
}

/**
 * Aligns the native layout direction (`I18nManager`) with the given locale.
 *
 * React Native can only apply a change to the layout direction after a full
 * reload, so this returns `true` when a reload is required for the change to
 * take visual effect, and `false` when the direction already matches.
 *
 * No-op in practice while the app ships LTR-only locales: `isRtlLocale` returns
 * false for every currently-supported locale, so `shouldBeRTL` stays false and
 * this never forces a direction change.
 */
export function syncLayoutDirection(locale: string | null | undefined): boolean {
  const shouldBeRTL = isRtlLocale(locale);

  // Always permit RTL so a later `forceRTL(true)` can take effect; harmless in LTR.
  I18nManager.allowRTL(true);

  if (I18nManager.isRTL === shouldBeRTL) {
    return false;
  }

  I18nManager.forceRTL(shouldBeRTL);
  return true;
}
