import { test as base, expect } from "@playwright/test";

/**
 * Read a resolved CSS custom property from the root element.
 * Returns the computed value string (e.g. "rgb(192, 38, 126)").
 */
export async function getCssVar(
  page: import("@playwright/test").Page,
  varName: string,
): Promise<string> {
  return page.evaluate((name) => {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }, varName);
}

/**
 * Get the current `data-theme` attribute from <html>.
 */
export async function getDataTheme(page: import("@playwright/test").Page): Promise<string | null> {
  return page.evaluate(() => document.documentElement.getAttribute("data-theme"));
}

/** Expected CSS variable values for quick assertions. */
export const LIGHT_THEME = {
  "--color-bg": "#faf7f8",
  "--color-text": "#111827",
  "--color-brand": "#c0267e",
} as const;

export const DARK_THEME = {
  "--color-bg": "#0c0c0f",
  "--color-text": "#f0f0f2",
  "--color-brand": "#e052a0",
} as const;

/** Accent brand color values (light mode). */
export const ACCENT_BRAND_LIGHT: Record<string, string> = {
  pink: "#c0267e",
  blue: "#2563eb",
  peach: "#d97706",
  mint: "#059669",
  lavender: "#7c3aed",
};

/** Accent brand color values (dark mode). */
export const ACCENT_BRAND_DARK: Record<string, string> = {
  pink: "#e052a0",
  blue: "#60a5fa",
  peach: "#fbbf24",
  mint: "#34d399",
  lavender: "#a78bfa",
};

export { base as test, expect };
