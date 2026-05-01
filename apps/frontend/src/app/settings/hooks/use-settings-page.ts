"use client";

import { useState } from "react";
import type { SettingsTab } from "@/types/settings";
import { DEFAULT_SETTINGS_TAB } from "../constants";

/**
 * Owns the Settings page's active-tab state.
 */
export function useSettingsPage() {
  const [tab, setTab] = useState<SettingsTab>(DEFAULT_SETTINGS_TAB);
  return { tab, setTab };
}
