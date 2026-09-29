import { expect, it, vi } from "vitest";
import gtConfig from "../gt.config.json";

vi.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "en-US" }] }));

it("loads Intl data for every configured translation locale without startup warnings", async () => {
  const warn = vi.spyOn(console, "warn");
  try {
    const { ensureIntlLocale } = await import("./gtIntlPolyfills");
    for (const locale of gtConfig.locales) {
      ensureIntlLocale(locale);
      const names = new Intl.DisplayNames([locale], { type: "language" });
      expect(names.of(locale)).toBeTruthy();
      expect(Intl.PluralRules.supportedLocalesOf([locale])).toEqual([locale]);
    }
    ensureIntlLocale("uk-UA");
    expect(new Intl.PluralRules("uk").select(2)).toBe("few");
    expect(warn).not.toHaveBeenCalled();
  } finally {
    warn.mockRestore();
  }
}, 30_000);
