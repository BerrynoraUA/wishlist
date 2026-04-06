import { withGTConfig } from "gt-next/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname
  }
};

export default withGTConfig(nextConfig, {
  loadTranslationsPath: "./src/loadTranslations.ts",
  defaultLocale: "en",
  locales: ["en", "uk"],
  /** Allow Accept-Language in GT middleware + server locale resolution */
  ignoreBrowserLocales: false,
});