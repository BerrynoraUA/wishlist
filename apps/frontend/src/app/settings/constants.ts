import type { SettingsTab } from "@/types/settings";

/**
 * Tab shown by default when the Settings page is first opened.
 */
export const DEFAULT_SETTINGS_TAB: SettingsTab = "profile";

/** Every tab the page can show, and the values the `?tab=` query param accepts. */
export const SETTINGS_TABS = [
  "profile",
  "account",
  "notifications",
  "appearance",
] as const satisfies readonly SettingsTab[];

export function isSettingsTab(value: string | null | undefined): value is SettingsTab {
  return SETTINGS_TABS.some((tab) => tab === value);
}
