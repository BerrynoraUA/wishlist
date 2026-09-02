"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SettingsTab } from "@/types/settings";
import { DEFAULT_SETTINGS_TAB, isSettingsTab } from "../constants";

/**
 * Reads the Settings page's active tab from `?tab=`, so a tab can be linked to and
 * survives a reload. An unknown or missing value falls back to the default tab rather
 * than showing nothing.
 */
export function useSettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: SettingsTab = isSettingsTab(tabParam) ? tabParam : DEFAULT_SETTINGS_TAB;

  const setTab = useCallback(
    (next: SettingsTab) => {
      const params = new URLSearchParams(searchParams);
      params.set("tab", next);
      // Pushed, not replaced: switching tabs is a navigation the back button should undo.
      router.push(`${pathname}?${params}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { tab, setTab };
}
